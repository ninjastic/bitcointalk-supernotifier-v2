import { Menu } from '@grammyjs/menu';
import { container } from 'tsyringe';

import type TrackedUser from '../../../../modules/posts/infra/typeorm/entities/TrackedUser';
import type IMenuContext from '../@types/IMenuContext';

import TrackedUsersRepository from '../../../../modules/posts/infra/typeorm/repositories/TrackedUsersRepository';
import { editHtml, editHtmlMenu } from './menu-utils';

export const TRACKED_USERS_MENU_HTML =
  '<b>Tracked Users</b>\n\nGet notified for new posts from your favorite users.';

async function getTrackedUser(telegramId: string, username: string) {
  const trackedUsersRepository = container.resolve(TrackedUsersRepository);
  return trackedUsersRepository.findOne({
    telegram_id: telegramId,
    username: username.toLowerCase(),
  });
}

async function saveTrackedUser(trackedUser: TrackedUser) {
  const trackedUsersRepository = container.resolve(TrackedUsersRepository);
  return trackedUsersRepository.save(trackedUser);
}

async function trackedUserInfoHtml(ctx: IMenuContext) {
  const trackedUser = await getTrackedUser(String(ctx.chat.id), ctx.session.selectedTrackedUser);
  return `<b>👤 Selected Tracked User:</b>\n\n${trackedUser.username}`;
}

const confirmRemoveTrackedUserMenu = new Menu<IMenuContext>('tur')
  .text('Yes, do it!', async (ctx) => {
    const trackedUsersRepository = container.resolve(TrackedUsersRepository);
    await trackedUsersRepository.delete(String(ctx.chat.id), ctx.session.selectedTrackedUser);
    ctx.session.selectedTrackedUser = null;
    await editHtmlMenu(ctx, TRACKED_USERS_MENU_HTML, trackedUsersMenu);
  })
  .row()
  .back('No, go back!', async (ctx) => {
    await editHtml(ctx, await trackedUserInfoHtml(ctx));
  });

const trackedUserInfoMenu = new Menu<IMenuContext>('tui')
  .submenu('🗑️ Remove User', 'tur', async (ctx) => {
    await editHtml(
      ctx,
      `Are you sure you want to remove the tracked user: <b>${ctx.session.selectedTrackedUser}</b>?`,
    );
  })
  .row()
  .text(
    async (ctx) => {
      const trackedUser = await getTrackedUser(
        String(ctx.chat.id),
        ctx.session.selectedTrackedUser,
      );
      return trackedUser.only_topics ? '✅ Topics Only Enabled' : '🚫 Topics Only Disabled';
    },
    async (ctx) => {
      const trackedUser = await getTrackedUser(
        String(ctx.chat.id),
        ctx.session.selectedTrackedUser,
      );
      trackedUser.only_topics = !trackedUser.only_topics;
      await saveTrackedUser(trackedUser);
      ctx.menu.update();
    },
  )
  .row()
  .back('↩ Go Back', async (ctx) => {
    ctx.session.selectedTrackedUser = null;
    await editHtml(ctx, TRACKED_USERS_MENU_HTML);
  });

const trackedUsersMenu = new Menu<IMenuContext>('tum')
  .dynamic(async (ctx, range) => {
    const trackedUsersRepository = container.resolve(TrackedUsersRepository);
    const trackedUsers = await trackedUsersRepository.findByTelegramId(String(ctx.chat.id));
    const page = ctx.session.page ?? 0;
    const totalPages = Math.max(1, Math.ceil(trackedUsers.length / 10));

    for (const trackedUser of trackedUsers.slice(page * 10, (page + 1) * 10)) {
      range
        .submenu(
          { text: trackedUser.username, payload: trackedUser.username },
          'tui',
          async (menuCtx) => {
            menuCtx.session.selectedTrackedUser = menuCtx.match;
            await editHtml(menuCtx, await trackedUserInfoHtml(menuCtx));
          },
        )
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
    await ctx.conversation.enter('addTrackedUser', { overwrite: true });
  })
  .back('↩ Go Back', async (ctx) => {
    await editHtml(ctx, '<b>Notify me about...</b>\n\nChoose what should trigger notifications.');
  });

trackedUsersMenu.register(trackedUserInfoMenu);
trackedUserInfoMenu.register(confirmRemoveTrackedUserMenu);

export default trackedUsersMenu;
