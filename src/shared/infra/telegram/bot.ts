import 'reflect-metadata';
import 'dotenv/config.js';
import { Bot, Context, session, SessionFlavor } from 'grammy';
import { RedisAdapter } from '@grammyjs/storage-redis';
import { conversations, createConversation } from '@grammyjs/conversations';
import { run } from '@grammyjs/runner';
import { container } from 'tsyringe';
import IORedis from 'ioredis';

import '../typeorm';
import '../../container';

import cache from '../../../config/cache';
import logger from '../../services/logger';
import ISession from './@types/ISession';

import TelegramQueue from '../bull/queues/TelegramQueue';

import { setupQuestionMiddlewares } from './menus';
import { mainMenuMiddleware } from './menus/mainMenu';
import { setupConversation, uidHelpMenu } from './conversations/setupConversation';

import startCommand from './commands/startCommand';
import menuCommand from './commands/menuCommand';
import alertCommand from './commands/alertCommand';
import setMeritCommand from './commands/setMeritCommand';
import altCommand from './commands/altCommand';
import infoCommand from './commands/infoCommand';
import devCommand from './commands/dev';

import FindUserByTelegramIdService from './services/FindUserByTelegramIdService';

class TelegramBot {
  public instance: Bot<Context & SessionFlavor<ISession>>;

  public queue: TelegramQueue;

  constructor() {
    this.instance = new Bot(process.env.TELEGRAM_BOT_TOKEN);
    this.queue = new TelegramQueue();

    this.middlewares();
    this.menus();
    this.conversations();
    this.commands();
    this.errorHandler();

    const runner = run(this.instance);

    if (process.env.NODE_ENV === 'production') {
      const stopRunner = () => runner.isRunning() && runner.stop();
      process.once('SIGINT', stopRunner);
      process.once('SIGTERM', stopRunner);
    }

    this.queue.run();
  }

  middlewares(): void {
    const {
      config: { redis }
    } = cache;
    this.instance.use(
      session({
        storage: new RedisAdapter({
          instance: new IORedis({
            host: redis.host,
            port: redis.port,
            password: redis.password,
            db: 1,
            keyPrefix: 'session:'
          })
        }),
        initial: () =>
          ({
            username: null,
            userId: null,
            mentions: false,
            merits: false,
            modlogs: false
          } as ISession)
      })
    );

    this.instance.use(conversations());
    this.instance.use(async (ctx, next) => {
      if (!ctx.session.username || !ctx.session.userId) {
        const findUserByTelegramId = container.resolve(FindUserByTelegramIdService);
        const user = await findUserByTelegramId.execute(String(ctx.from.id));
        if (user) {
          ctx.session.username = user.username;
          ctx.session.userId = user.user_id;
          ctx.session.mentions = user.enable_mentions;
          ctx.session.merits = user.enable_merits;
          ctx.session.modlogs = user.enable_modlogs;
        }
      }
      await next();
    });
    setupQuestionMiddlewares(this.instance);
    this.instance.use(mainMenuMiddleware);
  }

  async commands(): Promise<void> {
    this.instance.command('start', startCommand);
    this.instance.command('menu', menuCommand);
    this.instance.command('alert', alertCommand);
    this.instance.hears(/\/?setmerit (.*)/i, setMeritCommand);
    this.instance.hears(/\/?alt (.*)/i, altCommand);
    this.instance.hears(/\/?info/i, infoCommand);

    this.instance.command('dev', devCommand);

    await this.instance.api.setMyCommands([
      {
        command: '/menu',
        description: 'Sends the menu in a message'
      }
    ]);
  }

  menus(): void {
    this.instance.use(uidHelpMenu);
  }

  conversations(): void {
    this.instance.use(createConversation(setupConversation, 'setup'));
  }

  errorHandler(): void {
    this.instance.errorBoundary(error => {
      logger.error(error);
    });
    this.instance.catch(error => logger.error(error));
  }
}

export default TelegramBot;
