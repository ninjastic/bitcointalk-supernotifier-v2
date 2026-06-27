import type { RunnerHandle } from '@grammyjs/runner';
import type { Api, Context, RawApi } from 'grammy';

import { conversations, createConversation } from '@grammyjs/conversations';
import { hydrate } from '@grammyjs/hydrate';
import { run } from '@grammyjs/runner';
import { RedisAdapter } from '@grammyjs/storage-redis';
import hardresetCommand, {
  hardResetConfirmInlineMenu,
} from '##/shared/infra/telegram/commands/hardresetCommand';
import { Bot, session } from 'grammy';
import IORedis from 'ioredis';
import { container } from 'tsyringe';

import type ISession from './@types/ISession';
import type IMenuContext from './@types/IMenuContext';

import cache from '../../../config/cache';
import logger from '../../services/logger';
import { checkBotNotificationError } from '../../services/utils';
import alertCommand, { setupAlertConfirmationHandlers } from './commands/alertCommand';
import altCommand from './commands/altCommand';
import apiCommand from './commands/apiCommand';
import authCommand from './commands/authCommand';
import devCommand from './commands/dev';
import helpCommand from './commands/helpCommand';
import infoCommand from './commands/infoCommand';
import newNotificationsCommand from './commands/newNotificationsCommand';
import lengthCommand from './commands/lengthCommand';
import menuCommand from './commands/menuCommand';
import minPostsCommand from './commands/minPostsCommand';
import resetCommand from './commands/resetCommand';
import setMeritCommand from './commands/setMeritCommand';
import startCommand from './commands/startCommand';
import addIgnoredBoardConversation, {
  cancelAddIgnoredBoardPromptInlineMenu,
  confirmAddIgnoredBoardInlineMenu,
} from './conversations/addIgnoredBoardConversation';
import addAdvancedMatchConversation from './conversations/addAdvancedMatchConversation';
import addTrackedBoardConversation, {
  cancelAddTrackedBoardPromptInlineMenu,
  confirmAddTrackedBoardInlineMenu,
} from './conversations/addTrackedBoardConversation';
import addTrackedUserConversation, {
  cancelAddTrackedUserPromptInlineMenu,
  confirmAddTrackedUserInlineMenu,
} from './conversations/addTrackedUserConversation';
import { setupConversation, uidHelpInlineMenu } from './conversations/setupConversation';
import { setupQuestionMiddlewares } from './menus';
import { mainMenu } from './menus/mainMenu';
import FindUserByTelegramIdService from './services/FindUserByTelegramIdService';
import { handleTrackTopicRepliesMenu } from './services/notifications/SendAutoTrackTopicNotificationService';

export function initialSession(): ISession {
  return {
    username: null,
    userId: null,
    mentions: false,
    onlyDirectMentions: false,
    ignoreNestedQuotes: false,
    newNotifications: false,
    merits: false,
    modlogs: false,
    track_topics: false,
    advancedMatchDraft: null,
    advancedMatchDraftField: null,
  };
}

class TelegramBot {
  public instance: Bot<IMenuContext, Api<RawApi>>;

  public runner: RunnerHandle;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    this.instance = new Bot(token, {
      // client: { environment: process.env.NODE_ENV === 'development' ? 'test' : 'prod' }
    });

    this.middlewares();
    this.conversations();
    this.inlineMenus();
    this.menus();
    this.questions();
    this.commands();
    this.errorHandler();

    this.runner = run(this.instance);
  }

  middlewares(): void {
    const {
      config: { redis },
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
            keyPrefix: 'session:',
          }),
        }),
        initial: () => initialSession(),
      }),
    );

    this.instance.use(hydrate());

    this.instance.use(async (ctx, next): Promise<void> => {
      if (ctx.chat.type === 'private') {
        await next();
        return;
      }

      if (!ctx.from) return;

      const chatMember = await ctx.getChatMember(ctx.from.id);
      if (['creator', 'administrator'].includes(chatMember.status)) {
        await next();
        return;
      }

      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery('Not allowed');
      }
    });

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
          ctx.session.ignoreNestedQuotes = user.enable_ignore_nested_quotes;
          ctx.session.newNotifications = user.enable_new_notifications;
          ctx.session.isGroup = ctx.chat.type !== 'private';
        }
      }
      await next();
    });

    setupAlertConfirmationHandlers(this.instance);
  }

  async commands(): Promise<void> {
    this.instance.command('start', startCommand);
    this.instance.command('help', helpCommand);
    this.instance.command('menu', menuCommand);
    this.instance.command('newnotifications', newNotificationsCommand);
    this.instance.command('alert', alertCommand);
    this.instance.hears(/\/?setmerit (.*)/i, setMeritCommand);
    this.instance.hears(/\/?alt (.*)/i, altCommand);
    this.instance.hears(/\/?info/i, infoCommand);
    this.instance.hears(/\/?api/i, apiCommand);
    this.instance.hears(/\/?length (.*)/i, lengthCommand);
    this.instance.hears(/\/?auth/i, authCommand);
    this.instance.hears(/\/?minposts? (.*)/i, minPostsCommand);
    this.instance.command('reset', resetCommand);
    this.instance.command('hardreset', hardresetCommand);

    this.instance.command('dev', devCommand);

    await this.instance.api.setMyCommands([
      {
        command: '/menu',
        description: 'Sends the menu in a message',
      },
      {
        command: '/help',
        description: 'Sends the help message',
      },
      {
        command: '/newnotifications',
        description: 'Toggles new notification formatting',
      },
    ]);
  }

  menus(): void {
    this.instance.use(mainMenu);
  }

  questions(): void {
    setupQuestionMiddlewares(this.instance);
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
      hardResetConfirmInlineMenu,
    );
    handleTrackTopicRepliesMenu(this.instance);
  }

  conversations(): void {
    const {
      config: { redis },
    } = cache;

    this.instance.use(
      conversations({
        storage: new RedisAdapter({
          instance: new IORedis({
            host: redis.host,
            port: redis.port,
            password: redis.password,
            db: 2,
            keyPrefix: 'convo:',
          }),
        }),
      }),
    );
    this.instance.use(
      createConversation(setupConversation, {
        id: 'setup',
        plugins: [hydrate(), uidHelpInlineMenu],
      }),
      createConversation(addTrackedBoardConversation, {
        id: 'addTrackedBoard',
        plugins: [
          hydrate(),
          cancelAddTrackedBoardPromptInlineMenu,
          confirmAddTrackedBoardInlineMenu,
        ],
      }),
      createConversation(addTrackedUserConversation, {
        id: 'addTrackedUser',
        plugins: [hydrate(), cancelAddTrackedUserPromptInlineMenu, confirmAddTrackedUserInlineMenu],
      }),
      createConversation(addIgnoredBoardConversation, {
        id: 'addIgnoredBoard',
        plugins: [
          hydrate(),
          cancelAddIgnoredBoardPromptInlineMenu,
          confirmAddIgnoredBoardInlineMenu,
        ],
      }),
      createConversation(addAdvancedMatchConversation, {
        id: 'addAdvancedMatch',
        plugins: [hydrate()],
      }),
    );
  }

  errorHandler(): void {
    this.instance.catch(async (error) => {
      const isBotBlocked = await checkBotNotificationError(error, String(error.ctx.chat.id));
      if (!isBotBlocked) {
        logger.error(error);
      }
    });
  }
}

export default TelegramBot;
