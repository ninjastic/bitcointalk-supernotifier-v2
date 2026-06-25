import 'reflect-metadata';
import 'module-alias/register';
import 'dotenv/config';
import type { ChatEvent, T } from '@simplex-chat/types';

import logger from '##/shared/services/logger';
import { api, bot, util } from 'simplex-chat';
import { createConnection } from 'typeorm';

import Checker from './checker';
import Db from './db';
import { handleChatMessage, handlers } from './handlers';

interface SimpleXChatErrorLike {
  chatError?: T.ChatError;
}

function getChatError(error: unknown): T.ChatError | undefined {
  if (error instanceof api.ChatCommandError && error.response.type === 'chatCmdError') {
    return error.response.chatError;
  }

  if (error && typeof error === 'object' && 'chatError' in error) {
    return (error as SimpleXChatErrorLike).chatError;
  }

  return undefined;
}

export class SimpleX {
  chat: api.ChatApi;
  address: string | undefined;
  db: Db;
  checker: Checker;
  connectedUsers: Set<number>;

  constructor() {
    this.db = new Db();
    this.checker = new Checker(this);
    this.connectedUsers = new Set();
  }

  async start() {
    const pendingEvents: ChatEvent[] = [];
    const pendingMessages: Array<{ chatItem: T.AChatItem; content: T.MsgContent }> = [];

    const [chat, , address] = await bot.run({
      profile: {
        displayName: 'BitcoinTalk SuperNotifier',
        fullName: 'BitcoinTalk SuperNotifier',
      },
      dbOpts: { type: 'sqlite', filePrefix: 'simplexdb' },
      options: {
        addressSettings: { autoAccept: false },
        logContacts: false,
      },
      onMessage: async (chatItem, content) => {
        if (!this.chat) {
          pendingMessages.push({ chatItem, content });
          return;
        }

        await handleChatMessage(chatItem, content, this);
      },
      events: {
        receivedContactRequest: async (event) => this.queueOrHandleEvent(event, pendingEvents),
        contactConnected: async (event) => this.queueOrHandleEvent(event, pendingEvents),
        chatError: async (event) => this.queueOrHandleEvent(event, pendingEvents),
        contactDeletedByContact: async (event) => this.queueOrHandleEvent(event, pendingEvents),
      },
    });

    this.chat = chat;
    this.address = address ? util.contactAddressStr(address.connLinkContact) : undefined;

    for (const event of pendingEvents) {
      await this.handleMsg(event);
    }

    for (const message of pendingMessages) {
      await handleChatMessage(message.chatItem, message.content, this);
    }

    logger.info({ address: this.address }, 'Bot is ready');

    await this.checker.start();
  }

  private async queueOrHandleEvent(event: ChatEvent, pendingEvents: ChatEvent[]): Promise<void> {
    if (!this.chat) {
      pendingEvents.push(event);
      return;
    }

    await this.handleMsg(event);
  }

  async isContactActive(contactId: number) {
    const r = (await this.chat.sendChatCmd(`/_info @${contactId}`)) as unknown as {
      type: 'contactInfo';
      contact: { contactStatus: string; activeConn?: { connStatus: string } };
    };
    if (r.type === 'contactInfo') {
      return r.contact.contactStatus === 'active' && r.contact.activeConn?.connStatus === 'ready';
    }
  }

  async handleMsg(r: ChatEvent) {
    if (!(r.type in handlers)) {
      logger.debug({ type: r.type, r }, 'Unknown message type');
      return;
    }

    await handlers[r.type](r, this).catch((err) => {
      logger.fatal(err);
    });
  }

  async sendMessage(contactId: number, text: string): Promise<{ sent: boolean; deleted: boolean }> {
    logger.info({ contactId, text }, 'Sending bot message');

    const message = [
      {
        msgContent: {
          type: 'text',
          text,
        },
        mentions: {},
      },
    ];

    try {
      const sent = await this.chat.apiSendMessages(
        ['direct' as T.ChatType, contactId],
        message as T.ComposedMessage[],
      );

      return { sent: Boolean(sent.length), deleted: false };
    } catch (error) {
      const chatError = getChatError(error);
      if (chatError?.type === 'error' && chatError.errorType.type === 'contactNotReady') {
        if (['deleted', 'deletedByUser'].includes(chatError.errorType.contact.contactStatus)) {
          logger.warn({ contactId }, 'Contact has deleted the chat, deleting contact');
          await this.deleteContact(contactId);
          return { sent: false, deleted: true };
        }

        logger.warn({ contactId }, 'Contact not ready to receive messages');
        return { sent: false, deleted: false };
      }

      if (
        chatError?.type === 'errorStore' &&
        chatError.storeError.type === 'contactNotFound' &&
        chatError.storeError.contactId === contactId
      ) {
        logger.warn({ contactId }, 'Contact was not found in SimpleX, deleting contact');
        await this.deleteContact(contactId);
        return { sent: false, deleted: true };
      }

      logger.error({ contactId, error }, 'Failed to send message due to unknown error');
      return { sent: false, deleted: false };
    }
  }

  async processUnsentNotifications(contactId: number) {
    const unsentNotifications = await this.db.getNotifications(
      (qb) =>
        qb
          .where({ sent: false, contact_id: contactId })
          .andWhereRaw("created_at >= datetime('now', '-48 hours')"),
      'asc',
    );

    for (const unsentNotification of unsentNotifications) {
      const notificationContactId = unsentNotification.contact_id;
      logger.info(
        { contactId: notificationContactId, unsentNotification },
        'Checking unsent notification',
      );

      const msg = await this.sendMessage(notificationContactId, unsentNotification.message);
      if (msg.sent) {
        await this.db.updateNotification(unsentNotification.id, { sent: true });
      } else if (!msg.deleted) {
        logger.warn(
          { contactId: notificationContactId, unsentNotification },
          'Failed to send unsent notification',
        );
      } else {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  async addConnectedUser(contactId: number) {
    if (this.connectedUsers.has(contactId) && !contactId) return;
    this.connectedUsers.add(contactId);
    logger.info({ contactId }, `Contact ${contactId} connected`);

    await this.processUnsentNotifications(contactId);
  }

  async deleteContact(contactId: number) {
    await this.db.deleteConversation(contactId);
    await this.db.deleteUser(contactId);

    this.connectedUsers.delete(contactId);
    logger.info({ contactId }, 'Contact deleted');
  }
}

createConnection().then(() => {
  const simplex = new SimpleX();
  simplex.start();
});
