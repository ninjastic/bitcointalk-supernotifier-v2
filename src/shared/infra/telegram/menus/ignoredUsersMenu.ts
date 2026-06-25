import { Menu } from '@grammyjs/menu';
import { StatelessQuestion } from '@grammyjs/stateless-question';
import { container } from 'tsyringe';

import type IMenuContext from '../@types/IMenuContext';

import AddIgnoredUserService from '../../../../modules/users/services/AddIgnoredUserService';
import RemoveIgnoredUserService from '../../../../modules/users/services/RemoveIgnoredUserService';
import logger from '../../../services/logger';
import FindIgnoredUsersByTelegramIdService from '../services/FindIgnoredUsersByTelegramIdService';
import { editHtml, editHtmlMenu, replyHtmlMenu } from './menu-utils';

export const IGNORED_USERS_MENU_HTML =
  "<b>Ignored Users</b>\n\nAdd or remove ignored users so you don't get notifications from them.";

async function getSelectedIgnoredUser(ctx: IMenuContext) {
  const findIgnoredUsersByTelegramId = container.resolve(FindIgnoredUsersByTelegramIdService);
  const ignoredUsers = await findIgnoredUsersByTelegramId.execute(String(ctx.chat.id));
  const selected = ctx.session.selectedIgnoredUser;
  return ignoredUsers.find(
    (ignoredUser) => ignoredUser.id === selected || ignoredUser.username === selected,
  );
}

async function ignoredUserInfoHtml(ctx: IMenuContext) {
  const ignoredUser = await getSelectedIgnoredUser(ctx);
  return `<b>Ignored User:</b>\n\n🏷️ <b>Username:</b> ${ignoredUser?.username || ctx.session.selectedIgnoredUser}\n`;
}

const confirmRemoveIgnoredUserMenu = new Menu<IMenuContext>('iur')
  .text('Yes, do it!', async (ctx) => {
    const ignoredUser = await getSelectedIgnoredUser(ctx);
    if (ignoredUser) {
      const removeIgnoredUser = container.resolve(RemoveIgnoredUserService);
      await removeIgnoredUser.execute(ignoredUser.username, String(ctx.chat.id));
    }
    ctx.session.selectedIgnoredUser = null;
    await editHtmlMenu(ctx, IGNORED_USERS_MENU_HTML, ignoredUsersMenu);
  })
  .row()
  .back('No, go back!', async (ctx) => {
    await editHtml(ctx, await ignoredUserInfoHtml(ctx));
  });

const ignoredUsersMenuInfoMenu = new Menu<IMenuContext>('iui')
  .submenu('🚫 Stop Ignoring', 'iur', async (ctx) => {
    const ignoredUser = await getSelectedIgnoredUser(ctx);
    await editHtml(
      ctx,
      `Are you sure you want to stop ignoring the user: <b>${ignoredUser?.username || ctx.session.selectedIgnoredUser}</b>?`,
    );
  })
  .row()
  .back('↩ Go Back', async (ctx) => {
    ctx.session.selectedIgnoredUser = null;
    await editHtml(ctx, IGNORED_USERS_MENU_HTML);
  });

const ignoredUsersMenu = new Menu<IMenuContext>('ium')
  .dynamic(async (ctx, range) => {
    const findIgnoredUsersByTelegramId = container.resolve(FindIgnoredUsersByTelegramIdService);
    const choices = await findIgnoredUsersByTelegramId.execute(String(ctx.chat.id));
    const page = ctx.session.page ?? 0;
    const totalPages = Math.max(1, Math.ceil(choices.length / 10));

    for (const choice of choices.slice(page * 10, (page + 1) * 10)) {
      range
        .submenu({ text: choice.username, payload: choice.id }, 'iui', async (menuCtx) => {
          menuCtx.session.selectedIgnoredUser = menuCtx.match;
          await editHtml(menuCtx, await ignoredUserInfoHtml(menuCtx));
        })
        .row();
    }

    if (totalPages > 1) {
      if (page > 0)
        range.text('◀️ Prev', (menuCtx) => {
          menuCtx.session.page = page - 1;
          menuCtx.menu.update();
        });
      range.text(`${page + 1}/${totalPages}`, (menuCtx) =>
        menuCtx.answerCallbackQuery(`Page ${page + 1} of ${totalPages}`),
      );
      if (page < totalPages - 1)
        range.text('Next ▶️', (menuCtx) => {
          menuCtx.session.page = page + 1;
          menuCtx.menu.update();
        });
      range.row();
    }
  })
  .text('✨ Add new', async (ctx) => {
    await addIgnoredUserQuestion.replyWithHTML(
      ctx,
      'What is the username of the user you want to ignore?',
    );
  })
  .back('↩ Go Back', async (ctx) => {
    await editHtml(ctx, "<b>Don't notify me about...</b>\n\nChoose what should be ignored.");
  });

ignoredUsersMenu.register(ignoredUsersMenuInfoMenu);
ignoredUsersMenuInfoMenu.register(confirmRemoveIgnoredUserMenu);

const addIgnoredUserQuestion = new StatelessQuestion(
  'addIgnoredUser',
  async (ctx: IMenuContext) => {
    const text = ctx.msg.text.toLowerCase().trim();

    if (!text) {
      await addIgnoredUserQuestion.replyWithHTML(
        ctx,
        'Invalid Username. What is the username of the user you want to ignore?',
      );
      return;
    }

    const addIgnoredUser = container.resolve(AddIgnoredUserService);

    try {
      await addIgnoredUser.execute(text, String(ctx.msg!.chat.id));
      await replyHtmlMenu(ctx, IGNORED_USERS_MENU_HTML, ignoredUsersMenu);
    } catch (error) {
      if (error.message === 'User already being ignored.') {
        await ctx.reply('You are already ignoring this user.', {
          reply_markup: { remove_keyboard: true },
        });
        return;
      }

      logger.error({ telegram_id: ctx.chat.id, error }, 'Error while adding Ignored User.');
      await ctx.reply('Something went wrong...', { reply_markup: { remove_keyboard: true } });
    }
  },
);

export { addIgnoredUserQuestion };
export default ignoredUsersMenu;
