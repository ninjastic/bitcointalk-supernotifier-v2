import type { Api, Context, RawApi, SessionFlavor } from 'grammy';
import { Bot, session } from 'grammy';
import { RedisAdapter } from '@grammyjs/storage-redis';
import { conversations, createConversation } from '@grammyjs/conversations';
import type { RunnerHandle } from '@grammyjs/runner';
import { run } from '@grammyjs/runner';
import { container } from 'tsyringe';
import IORedis from 'ioredis';

import cache from '../../../config/cache';
import logger from '../../services/logger';
import type ISession from './@types/ISession';

import { checkBotNotificationError } from '../../services/utils';
import FindUserByTelegramIdService from './services/FindUserByTelegramIdService';

import { setupQuestionMiddlewares } from './menus';
import { mainMenuMiddleware } from './menus/mainMenu';

import { setupConversation, uidHelpInlineMenu } from './conversations/setupConversation';
import addTrackedBoardConversation, {
  confirmAddTrackedBoardInlineMenu,
  cancelAddTrackedBoardPromptInlineMenu
} from './conversations/addTrackedBoardConversation';
import addIgnoredBoardConversation, {
  cancelAddIgnoredBoardPromptInlineMenu,
  confirmAddIgnoredBoardInlineMenu
} from './conversations/addIgnoredBoardConversation';
import addTrackedUserConversation, {
  cancelAddTrackedUserPromptInlineMenu,
  confirmAddTrackedUserInlineMenu
} from './conversations/addTrackedUserConversation';
import { handleTrackTopicRepliesMenu } from './services/notifications/SendAutoTrackTopicNotificationService';

import startCommand from './commands/startCommand';
import helpCommand from './commands/helpCommand';
import menuCommand from './commands/menuCommand';
import alertCommand from './commands/alertCommand';
import setMeritCommand from './commands/setMeritCommand';
import altCommand from './commands/altCommand';
import infoCommand from './commands/infoCommand';
import devCommand from './commands/dev';
import apiCommand from './commands/apiCommand';
import resetCommand from './commands/resetCommand';
import lengthCommand from './commands/lengthCommand';
import imageCommand from './commands/imageCommand';
import authCommand from './commands/authCommand';
import minPostsCommand from './commands/minPostsCommand';
import hardresetCommand, { hardResetConfirmInlineMenu } from '##/shared/infra/telegram/commands/hardresetCommand';

export function initialSession(): ISession {
  return {
    username: null,
    userId: null,
    mentions: false,
    merits: false,
    modlogs: false
  } as ISession;
}

class TelegramBot {
  public instance: Bot<Context & SessionFlavor<ISession>, Api<RawApi>>;

  public runner: RunnerHandle;

  constructor() {
    this.instance = new Bot(process.env.TELEGRAM_BOT_TOKEN, {
      // client: { environment: process.env.NODE_ENV === 'development' ? 'test' : 'prod' }
    });

    this.middlewares();
    this.inlineMenus();
    this.conversations();
    this.menus();
    this.commands();
    this.errorHandler();

    this.runner = run(this.instance);
  }

  middlewares(): void {
    const {
      config: { redis }
    } = cache;
    this.instance.use(
      session({
        getSessionKey(ctx: Context): string | undefined {
          return ctx.chat?.id.toString();
        },
        storage: new RedisAdapter({
          instance: new IORedis({
            host: redis.host,
            port: redis.port,
            password: redis.password,
            db: 1,
            keyPrefix: 'session:'
          })
        }),
        initial: () => initialSession()
      })
    );

    this.instance.use(async (ctx, next): Promise<void> => {
      if (ctx.chat.type === 'private') {
        await next();
        return;
      }

      const chatMember = await ctx.getChatMember(ctx.from.id);
      if (['creator', 'administrator'].includes(chatMember.status)) {
        await next();
        return;
      }

      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery('Not allowed');
      }
    });

    this.instance.use(conversations());
    this.instance.command('reset', resetCommand);
    this.instance.use(async (ctx, next) => {
      if (!ctx.session.username || !ctx.session.userId) {
        const findUserByTelegramId = container.resolve(FindUserByTelegramIdService);
        const user = await findUserByTelegramId.execute(String(ctx.chat.id));
        if (user) {
          ctx.session.username = user.username;
          ctx.session.userId = user.user_id;
          ctx.session.mentions = user.enable_mentions;
          ctx.session.merits = user.enable_merits;
          ctx.session.modlogs = user.enable_modlogs;
          ctx.session.track_topics = user.enable_auto_track_topics;
          ctx.session.onlyDirectMentions = user.enable_only_direct_mentions;
          ctx.session.isGroup = ctx.chat.type !== 'private';
        }
      }
      await next();
    });
    setupQuestionMiddlewares(this.instance);
  }

  async commands(): Promise<void> {
    this.instance.command('start', startCommand);
    this.instance.command('help', helpCommand);
    this.instance.command('menu', menuCommand);
    this.instance.command('alert', alertCommand);
    this.instance.hears(/\/?setmerit (.*)/i, setMeritCommand);
    this.instance.hears(/\/?alt (.*)/i, altCommand);
    this.instance.hears(/\/?info/i, infoCommand);
    this.instance.hears(/\/?api/i, apiCommand);
    this.instance.hears(/\/?length (.*)/i, lengthCommand);
    this.instance.hears(/\/?image/i, imageCommand);
    this.instance.hears(/\/?auth/i, authCommand);
    this.instance.hears(/\/?minposts? (.*)/i, minPostsCommand);
    this.instance.command('hardreset', hardresetCommand);

    this.instance.command('dev', devCommand);

    await this.instance.api.setMyCommands([
      {
        command: '/menu',
        description: 'Sends the menu in a message'
      },
      {
        command: '/help',
        description: 'Sends the help message'
      }
    ]);
  }

  menus(): void {
    this.instance.use(mainMenuMiddleware);
  }

  inlineMenus(): void {
    this.instance.use(
      uidHelpInlineMenu,
      confirmAddTrackedBoardInlineMenu,
      cancelAddTrackedBoardPromptInlineMenu,
      confirmAddTrackedUserInlineMenu,
      cancelAddTrackedUserPromptInlineMenu,
      confirmAddIgnoredBoardInlineMenu,
      cancelAddIgnoredBoardPromptInlineMenu,
      hardResetConfirmInlineMenu
    );
    handleTrackTopicRepliesMenu(this.instance);
  }

  conversations(): void {
    this.instance.use(
      createConversation(setupConversation, 'setup'),
      createConversation(addTrackedBoardConversation, 'addTrackedBoard'),
      createConversation(addTrackedUserConversation, 'addTrackedUser'),
      createConversation(addIgnoredBoardConversation, 'addIgnoredBoard')
    );
  }

  errorHandler(): void {
    this.instance.catch(async error => {
      const isBotBlocked = await checkBotNotificationError(error, String(error.ctx.chat.id));
      if (!isBotBlocked) {
        logger.error(error);
      }
    });
  }
}

export default TelegramBot;
