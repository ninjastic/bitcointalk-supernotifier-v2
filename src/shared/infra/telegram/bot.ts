import 'reflect-metadata';
import 'dotenv/config.js';
import path from 'path';
import {
  Telegraf,
  Telegraf as TelegrafTypes,
  Context as TelegrafContext,
} from 'telegraf';
import LocalSession from 'telegraf-session-local';
import { createConnection } from 'typeorm';

import '../../container';

import ISession from './@types/ISession';

import {
  usernameConfirmMenuMiddleware,
  userIdConfirmMenuMiddleware,
  configureMentionsMenuMiddleware,
  mainMenuMiddleware,
} from './menus';

import startCommand from './commands/startCommand';
import menuCommand from './commands/menuCommand';
import messageHandler from './commands/messageHandler';
import callbackHandler from './commands/callbackHandler';

import telegramNotificationsQueue from '../bull/queues/TelegramNotificationsQueue';

interface Context extends TelegrafContext {
  session: ISession;
}

class TelegramBot {
  public bot: TelegrafTypes<TelegrafContext>;

  public session: LocalSession<ISession>;

  constructor() {
    createConnection().then(() => {
      this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

      this.session = new LocalSession<ISession>({
        database: path.resolve(
          __dirname,
          '..',
          '..',
          '..',
          '..',
          'telegram_sessions.json',
        ),
        storage: LocalSession.storageFileAsync,
      });

      this.middlewares();
      this.menus();
      this.commands();
      this.errorHandler();

      this.bot.launch();
      this.queues();
    });
  }

  middlewares(): void {
    this.bot.use(this.session.middleware());
    this.bot.use(callbackHandler);
  }

  menus(): void {
    this.bot.use(usernameConfirmMenuMiddleware);
    this.bot.use(userIdConfirmMenuMiddleware);
    this.bot.use(configureMentionsMenuMiddleware);
    this.bot.use(mainMenuMiddleware);
  }

  commands(): void {
    this.bot.start(startCommand);
    this.bot.command('menu', menuCommand);

    this.bot.on('message', messageHandler);
  }

  queues(): void {
    telegramNotificationsQueue.run();
  }

  errorHandler(): void {
    this.bot.catch(error => {
      console.log('Error: ', error);
    });
  }
}

export default TelegramBot;
