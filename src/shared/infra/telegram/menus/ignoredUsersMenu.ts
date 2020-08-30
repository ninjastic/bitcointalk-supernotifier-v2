import { Context } from 'telegraf';
import { MenuTemplate } from 'telegraf-inline-menu';
import { container } from 'tsyringe';
import TelegrafStatelessQuestion from 'telegraf-stateless-question';

import logger from '../../../services/logger';

import ISession from '../@types/ISession';

import FindIgnoredUsersByTelegramIdService from '../services/FindIgnoredUsersByTelegramIdService';
import AddIgnoredUserService from '../../../../modules/users/services/AddIgnoredUserService';
import RemoveIgnoredUserService from '../../../../modules/users/services/RemoveIgnoredUserService';

import { ignoredUsersMenuMiddleware } from './index';

interface MenuContext extends Context {
  session: ISession;
}

const ignoredUsersMenu = new MenuTemplate<MenuContext>(() => {
  return {
    text: `<b>Ignored Users</b>\n\nAdd or remove ignored users so you don't get notifications from them.`,
    parse_mode: 'HTML',
  };
});

const ignoredUsersMenuInfoMenu = new MenuTemplate<MenuContext>(async ctx => {
  let message = '';
  message += `<b>Ignored User:</b>\n\n`;
  message += `🏷️ <b>Username:</b> ${ctx.match[1]}\n`;

  return {
    text: message,
    parse_mode: 'HTML',
  };
});

const confirmRemoveIgnoredUserMenu = new MenuTemplate<MenuContext>(
  async ctx => {
    return {
      text: `Are you sure you want to stop ignoring the user: <b>${ctx.match[1]}</b>?`,
      parse_mode: 'HTML',
    };
  },
);

confirmRemoveIgnoredUserMenu.interact('Yes, do it!', 'yes', {
  do: async ctx => {
    const removeIgnoredUser = container.resolve(RemoveIgnoredUserService);

    await removeIgnoredUser.execute(ctx.match[1], ctx.chat.id);

    return '/main/ignoredUsers/';
  },
});

confirmRemoveIgnoredUserMenu.interact('No, go back!', 'no', {
  do: async () => {
    return `..`;
  },
});

ignoredUsersMenuInfoMenu.submenu(
  '❌ Stop Ignoring',
  'remove',
  confirmRemoveIgnoredUserMenu,
);

ignoredUsersMenuInfoMenu.interact('↩ Go Back', 'back', {
  do: () => {
    return '..';
  },
});

const addIgnoredUserQuestion = new TelegrafStatelessQuestion(
  'addIgnoredUser',
  async (ctx: MenuContext) => {
    const text = ctx.message.text.toLowerCase().trim();

    if (text) {
      const addIgnoredUser = container.resolve(AddIgnoredUserService);

      try {
        await addIgnoredUser.execute(text, ctx.message.chat.id);

        let message = '';
        message += 'You are now ignoring the user: ';
        message += `<b>${text}</b>`;

        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: { remove_keyboard: true },
        });

        await ignoredUsersMenuMiddleware.replyToContext(ctx);
      } catch (error) {
        if (error.message === 'User already being ignored.') {
          await ctx.reply('You are already ignoring this user.', {
            reply_markup: { remove_keyboard: true },
          });

          return;
        }

        logger.error(
          { telegram_id: ctx.chat.id, error },
          'Error while adding Ignored User.',
        );

        await ctx.reply('Something went wrong...', {
          reply_markup: { remove_keyboard: true },
        });
      }
    } else {
      const message = `Invalid Username. What is the username of the user you want to ignore?`;
      await addIgnoredUserQuestion.replyWithHTML(ctx, message);
    }
  },
);

const getIgnoredUsers = async (ctx: MenuContext) => {
  const findIgnoredUsersByTelegramId = container.resolve(
    FindIgnoredUsersByTelegramIdService,
  );

  const choices = await findIgnoredUsersByTelegramId.execute(ctx.chat.id);

  const formatted = {};

  choices.forEach(choice => {
    formatted[choice.username] = choice.username;
  });

  return formatted;
};

ignoredUsersMenu.chooseIntoSubmenu(
  'ignoredUsers',
  getIgnoredUsers,
  ignoredUsersMenuInfoMenu,
  {
    maxRows: 4,
    columns: 1,
    getCurrentPage: ctx => ctx.session.page,
    setPage: (ctx, page) => {
      ctx.session.page = page;
    },
    disableChoiceExistsCheck: true,
  },
);

ignoredUsersMenu.interact('✨ Add new', 'add', {
  do: async ctx => {
    const message = 'What is the username of the user you want to ignore?';

    await addIgnoredUserQuestion.replyWithHTML(ctx, message);
    return true;
  },
});

ignoredUsersMenu.interact('↩ Go Back', 'back', {
  do: () => {
    return '..';
  },
  joinLastRow: true,
});

export { addIgnoredUserQuestion };
export default ignoredUsersMenu;
