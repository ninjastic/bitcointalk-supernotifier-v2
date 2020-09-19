import 'reflect-metadata';
import 'dotenv/config.js';
import path from 'path';
import {
  Telegraf,
  Telegraf as TelegrafTypes,
  Context as TelegrafContext,
} from 'telegraf';
import LocalSession from 'telegraf-session-local';

import '../typeorm';
import '../../container';

import logger from '../../services/logger';
import ISession from './@types/ISession';

import {
  usernameConfirmMenuMiddleware,
  userIdConfirmMenuMiddleware,
  configureMentionsMenuMiddleware,
  mainMenuMiddleware,
  addTrackedTopicLinkQuestion,
  addIgnoredUserQuestion,
  addIgnoredTopicLinkQuestion,
} from './menus';

import startCommand from './commands/startCommand';
import menuCommand from './commands/menuCommand';
import alertCommand from './commands/alertCommand';
import messageHandler from './commands/messageHandler';
import setMeritCommand from './commands/setMeritCommand';
import altCommand from './commands/altCommand';
import callbackHandler from './commands/callbackHandler';

import TelegramQueue from '../bull/queues/TelegramQueue';

class TelegramBot {
  public instance: TelegrafTypes<TelegrafContext>;

  public queue: TelegramQueue;

  public session: LocalSession<ISession>;

  constructor() {
    this.instance = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    this.queue = new TelegramQueue();
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
    this.questions();
    this.commands();
    this.errorHandler();

    this.instance.launch();
    this.queue.run();
  }

  middlewares(): void {
    this.instance.use(this.session.middleware());
    this.instance.use(callbackHandler);
  }

  menus(): void {
    this.instance.use(usernameConfirmMenuMiddleware);
    this.instance.use(userIdConfirmMenuMiddleware);
    this.instance.use(configureMentionsMenuMiddleware);
    this.instance.use(mainMenuMiddleware);
  }

  questions(): void {
    this.instance.use(addTrackedTopicLinkQuestion.middleware());
    this.instance.use(addIgnoredUserQuestion.middleware());
    this.instance.use(addIgnoredTopicLinkQuestion.middleware());
  }

  commands(): void {
    this.instance.start(startCommand);
    this.instance.command('menu', menuCommand);
    this.instance.command('alert', alertCommand);
    this.instance.hears(/\/?setMerit (.*)/gi, setMeritCommand);
    this.instance.hears(/\/?alt (.*)/gi, altCommand);
    this.instance.on('message', messageHandler);
  }

  errorHandler(): void {
    this.instance.catch(error => {
      logger.error(error);
    });
  }
}

export default TelegramBot;
