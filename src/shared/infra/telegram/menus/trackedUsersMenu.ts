import { MenuTemplate } from 'grammy-inline-menu';
import { container } from 'tsyringe';

import IMenuContext from '../@types/IMenuContext';
import TrackedUsersRepository from '../../../../modules/posts/infra/typeorm/repositories/TrackedUsersRepository';

const trackedUsersMenu = new MenuTemplate<IMenuContext>(() => ({
  text: '<b>Tracked Users</b>\n\nGet notified for new posts from your favorite users.',
  parse_mode: 'HTML'
}));

const confirmRemoveTrackedUserMenu = new MenuTemplate<IMenuContext>(async ctx => {
  const username = ctx.match[1];

  return {
    text: `Are you sure you want to remove the tracked user: <b>${username}</b>?`,
    parse_mode: 'HTML'
  };
});

confirmRemoveTrackedUserMenu.interact('Yes, do it!', 'yes', {
  do: async ctx => {
    const trackedUsersRepository = container.resolve(TrackedUsersRepository);
    await trackedUsersRepository.delete(String(ctx.chat.id), ctx.match[1]);
    return '/tu/';
  }
});

confirmRemoveTrackedUserMenu.interact('No, go back!', 'no', {
  do: async () => `..`
});

const getTrackedUser = async (telegramId: string, username: string) => {
  const trackedUsersRepository = container.resolve(TrackedUsersRepository);
  const trackedUser = await trackedUsersRepository.findOne({
    telegram_id: telegramId,
    username: username.toLowerCase()
  });
  return trackedUser;
};

const trackedUserInfoMenu = new MenuTemplate<IMenuContext>(async ctx => {
  const trackedUser = await getTrackedUser(String(ctx.from.id), ctx.match[1]);

  let message = '';
  message += '<b>👤 Selected Tracked User:</b>\n\n';
  message += `${trackedUser.username}`;

  return {
    text: message,
    parse_mode: 'HTML'
  };
});

trackedUserInfoMenu.submenu('❌ Remove User', 'remove', confirmRemoveTrackedUserMenu);

trackedUserInfoMenu.interact('↩ Go Back', 'back', {
  do: () => '..'
});

const getTrackedUsers = async (ctx: IMenuContext) => {
  const trackedUsersRepository = container.resolve(TrackedUsersRepository);
  const trackedUsers = await trackedUsersRepository.findByTelegramId(String(ctx.from.id));

  const choices = {};

  for (const trackedUser of trackedUsers) {
    choices[trackedUser.username] = trackedUser.username;
  }

  return choices;
};

trackedUsersMenu.chooseIntoSubmenu('tu', getTrackedUsers, trackedUserInfoMenu, {
  maxRows: 5,
  columns: 1,
  getCurrentPage: ctx => ctx.session.page,
  setPage: (ctx, page) => {
    ctx.session.page = page;
  },
  disableChoiceExistsCheck: true
});

trackedUsersMenu.interact('✨ Add new', 'add', {
  do: async ctx => {
    await ctx.conversation.enter('addTrackedUser', { overwrite: true });
    return true;
  }
});

trackedUsersMenu.interact('↩ Go Back', 'back', {
  do: () => '..',
  joinLastRow: true
});

export default trackedUsersMenu;
