import 'reflect-metadata';
import 'module-alias/register';
import 'dotenv/config';
import { ChatClient } from 'simplex-chat';
import { createConnection } from 'typeorm';
import logger from '##/shared/services/logger';
import { handlers } from './handlers';
import Db from './db';
import Checker from './checker';
import type { ChatEvent } from '@simplex-chat/types';

export class SimpleX {
  chat: ChatClient;
  address: string;
  db: Db;
  checker: Checker;
  connectedUsers: Set<number>;

  constructor() {
    this.db = new Db();
    this.checker = new Checker(this);
    this.connectedUsers = new Set();
  }

  async start() {
    this.chat = await ChatClient.create(process.env.SIMPLEX_WS);
    const user = await this.chat.apiGetActiveUser();

    if (!user) {
      throw new Error('No user profile');
    }

    const { profileId } = user.profile;

    this.address = await this.chat.apiGetUserAddress(profileId);
    if (!this.address) {
      this.address = await this.chat.apiCreateUserAddress(profileId);
    }

    await this.chat.disableAddressAutoAccept(profileId);
    await this.chat.apiUpdateProfile(profileId, {
      displayName: 'BitcoinTalk SuperNotifier',
      fullName: 'BitcoinTalk SuperNotifier'
    });

    logger.info({ address: this.address }, 'Bot is ready');

    await this.checker.start();

    for await (const r of this.chat.msgQ) {
      await this.handleMsg(r);
    }
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

    await handlers[r.type](r, this).catch(err => {
      logger.fatal(err);
    });
  }

  async sendMessage(contactId: number, text: string): Promise<{ sent: boolean; deleted: boolean }> {
    logger.info({ contactId, text }, 'Sending bot message');

    const message = [
      {
        msgContent: {
          type: 'text',
          text: text
        },
        mentions: {}
      }
    ];

    try {
      const sent = await this.chat.sendChatCmd(`/_send @${contactId} json ${JSON.stringify(message)}`);

      if (sent.type === 'chatCmdError') {
        if (sent.chatError.type === 'error' && sent.chatError.errorType.type === 'contactNotReady') {
          if (['deleted', 'deletedByUser'].includes(sent.chatError.errorType.contact.contactStatus)) {
            logger.warn({ contactId }, 'Contact has deleted the chat, deleting contact');
            this.deleteContact(contactId);
            return { sent: false, deleted: true };
          } else {
            logger.warn({ contactId }, 'Contact not ready to receive messages');
            return { sent: false, deleted: false };
          }
        }

        logger.error({ contactId, sent }, 'Failed to send message');
        return { sent: false, deleted: false };
      }

      return { sent: true, deleted: false };
    } catch (error) {
      logger.error({ contactId, error }, 'Failed to send message due to unknown error');
      return { sent: false, deleted: false };
    }
  }

  async processUnsentNotifications(contactId: number) {
    const unsentNotifications = await this.db.getNotifications(
      qb => qb.where({ sent: false, contact_id: contactId }).andWhereRaw("created_at >= datetime('now', '-48 hours')"),
      'asc'
    );

    for (const unsentNotification of unsentNotifications) {
      const contactId = unsentNotification.contact_id;
      logger.info({ contactId, unsentNotification }, 'Checking unsent notification');

      const msg = await this.sendMessage(contactId, unsentNotification.message);
      if (msg.sent) {
        await this.db.updateNotification(unsentNotification.id, { sent: true });
      } else if (!msg.deleted) {
        logger.warn({ contactId, unsentNotification }, 'Failed to send unsent notification');
      } else {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
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
    logger.info({ contactId: contactId }, 'Contact deleted');
  }
}

createConnection().then(() => {
  const simplex = new SimpleX();
  simplex.start();
});
