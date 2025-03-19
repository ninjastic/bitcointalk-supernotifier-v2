import 'reflect-metadata';
import 'module-alias/register';
import 'dotenv/config';
import { ChatClient } from 'simplex-chat';
import { ChatResponse } from 'simplex-chat/dist/response';
import { createConnection } from 'typeorm';
import logger from '##/shared/services/logger';
import { handlers } from './handlers';
import Db from './db';
import Checker from './checker';
import { ChatType } from 'simplex-chat/dist/command';

export class SimpleX {
  chat: ChatClient;
  address: string;
  db: Db;
  checker: Checker;

  constructor() {
    this.db = new Db();
    this.checker = new Checker(this);
  }

  async start() {
    this.chat = await ChatClient.create(process.env.SIMPLEX_WS);
    const user = await this.chat.apiGetActiveUser();

    if (!user) {
      throw new Error('No user profile');
    }

    this.address = (await this.chat.apiGetUserAddress()) || (await this.chat.apiCreateUserAddress());
    await this.chat.enableAddressAutoAccept(false);
    await this.chat.apiUpdateProfile(user.profile.profileId, {
      displayName: 'BitcoinTalk SuperNotifier',
      fullName: 'BitcoinTalk SuperNotifier'
    });

    logger.info({ address: this.address }, 'Bot is ready');

    await this.checker.start();

    for await (const r of this.chat.msgQ) {
      await this.handleMsg(r);
    }
  }

  async handleMsg(r: ChatResponse) {
    if (!(r.type in handlers)) {
      logger.warn({ type: r.type, r }, 'Unknown message type');
      return;
    }

    await handlers[r.type](r, this).catch(err => {
      logger.fatal(err)
    });
  }
  
  async sendMessage(contactId: number, text: string) {
    logger.info({ contactId, text }, 'Sending bot message')
    return this.chat.apiSendTextMessage(ChatType.Direct, contactId, text);
  }
  
}

createConnection().then(() => {
  const simplex = new SimpleX();
  simplex.start();
});
