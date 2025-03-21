import 'reflect-metadata';
import 'module-alias/register';
import 'dotenv/config';
import { ChatClient } from 'simplex-chat';
import { ChatInfoType, ChatResponse } from 'simplex-chat/dist/response';
import { createConnection } from 'typeorm';
import logger from '##/shared/services/logger';
import { handlers } from './handlers';
import Db from './db';
import Checker from './checker';
import { ChatType } from 'simplex-chat/dist/command';
import { hasNotificationMessageSent } from './utils';

type Chat = {
  chatInfo: {
    type: ChatInfoType;
    contact: {
      activeConn: {
        connStatus: string;
        contactConnInitiated: boolean;
      };
      contactStatus: string;
    };
  };
};

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

    this.address = (await this.chat.apiGetUserAddress()) || (await this.chat.apiCreateUserAddress());
    await this.chat.disableAddressAutoAccept();
    await this.chat.apiUpdateProfile(user.profile.profileId, {
      displayName: 'BitcoinTalk SuperNotifier',
      fullName: 'BitcoinTalk SuperNotifier'
    });

    await this.getActiveContacts();

    logger.info({ address: this.address }, 'Bot is ready');

    await this.checker.start();

    for await (const r of this.chat.msgQ) {
      await this.handleMsg(r);
    }
  }

  async getActiveContacts() {
    const users = await this.db.getUsers();
    const contacts = users.map(u => u.contact_id);
    const activeConn = [];
    for (const contactId of contacts) {
      if (await this.isContactActive(contactId)) {
        activeConn.push(contactId);
        await this.addConnectedUser(contactId);
      }
    }

    logger.info({ activeConn }, `${activeConn.length} active contacts of ${contacts.length}`);

    return activeConn;
  }

  async isContactActive(contactId: number) {
    const r = (await this.chat.apiGetChat(ChatType.Direct, contactId, { count: 0 })) as unknown as Chat;
    if (r.chatInfo.type !== 'direct') {
      return false;
    }
    return r.chatInfo.contact.contactStatus === 'active' && r.chatInfo.contact.activeConn?.connStatus === 'ready';
  }

  async handleMsg(r: ChatResponse) {
    if (!(r.type in handlers)) {
      logger.warn({ type: r.type, r }, 'Unknown message type');
      return;
    }

    await handlers[r.type](r, this).catch(err => {
      logger.fatal(err);
    });
  }

  async sendMessage(contactId: number, text: string) {
    logger.info({ contactId, text }, 'Sending bot message');

    if (!this.connectedUsers.has(contactId)) {
      logger.warn({ contactId }, 'Contact not connected');
      return [];
    }

    return this.chat.apiSendTextMessage(ChatType.Direct, contactId, text).catch(err => {
      logger.error({ err, contactId, text }, 'Error when sending message');
      return [];
    });
  }

  async addConnectedUser(contactId: number) {
    if (this.connectedUsers.has(contactId)) return;

    this.connectedUsers.add(contactId);
    logger.info({ contactId }, `Contact ${contactId} connected`);

    const unsentNotifications = await this.db.getNotifications({ contact_id: contactId, sent: false }, 'asc');

    for (const unsentNotification of unsentNotifications) {
      logger.info({ contactId, unsentNotification }, 'Sending unsent notification');
      const msg = await this.sendMessage(contactId, unsentNotification.message);
      if (hasNotificationMessageSent(msg[0])) {
        await this.db.updateNotification(unsentNotification.id, { sent: true });
      } else {
        logger.warn({ contactId, unsentNotification }, 'Failed to send unsent notification');
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async removeConnectedUser(contactId: number) {
    if (!this.connectedUsers.has(contactId)) return;

    this.connectedUsers.delete(contactId);
    logger.info({ contactId }, `Contact ${contactId} disconnected`);
  }
}

createConnection().then(() => {
  const simplex = new SimpleX();
  simplex.start();
});
