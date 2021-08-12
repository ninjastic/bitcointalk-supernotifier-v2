import { Context } from 'telegraf';
import { MenuTemplate } from 'telegraf-inline-menu';
import { container } from 'tsyringe';

import ISession from '../@types/ISession';

import bot from '../index';

import UpdateUserNotificationService from '../services/UpdateUserNotificationService';

interface MenuContext extends Context {
  session: ISession;
}

const notificationsMenu = new MenuTemplate<MenuContext>(() => {
  return {
    text: `<b>Notifications</b>\n\nEnable or disable specific notifications.`,
    parse_mode: 'HTML',
  };
});

const handleNotificationToggle = async (ctx: MenuContext) => {
  const updateUserNotification = container.resolve(
    UpdateUserNotificationService,
  );

  if (ctx.update.callback_query.data === '/main/notifications/merits') {
    ctx.session.merits = !ctx.session.merits;
    await bot.session.saveSession(bot.session.getSessionKey(ctx), ctx.session);

    await updateUserNotification.execute(
      ctx.update.callback_query.from.id,
      'merits',
      ctx.session.merits,
    );
  }

  if (ctx.update.callback_query.data === '/main/notifications/mentions') {
    ctx.session.mentions = !ctx.session.mentions;
    await bot.session.saveSession(bot.session.getSessionKey(ctx), ctx.session);

    await updateUserNotification.execute(
      ctx.update.callback_query.from.id,
      'mentions',
      ctx.session.mentions,
    );
  }

  if (ctx.update.callback_query.data === '/main/notifications/modlogs') {
    ctx.session.modlogs = !ctx.session.modlogs;
    await bot.session.saveSession(bot.session.getSessionKey(ctx), ctx.session);

    await updateUserNotification.execute(
      ctx.update.callback_query.from.id,
      'modlogs',
      ctx.session.modlogs,
    );
  }

  await ctx.answerCbQuery();
};

const mentionsEnabled = (ctx: MenuContext) => {
  return ctx.session.mentions;
};

const meritsEnabled = (ctx: MenuContext) => {
  return ctx.session.merits;
};

const modlogsEnabled = (ctx: MenuContext) => {
  return ctx.session.modlogs;
};

notificationsMenu.interact(
  ctx =>
    mentionsEnabled(ctx) ? '✅ Mentions Enabled ' : '❌ Mentions Disabled',
  'mentions',
  {
    do: async ctx => {
      await ctx.answerCbQuery();

      handleNotificationToggle(ctx);

      return true;
    },
  },
);

notificationsMenu.interact(
  ctx => (meritsEnabled(ctx) ? '✅ Merits Enabled' : '❌ Merits Disabled'),
  'merits',
  {
    do: async ctx => {
      await ctx.answerCbQuery();

      handleNotificationToggle(ctx);

      return true;
    },
  },
);

notificationsMenu.interact(
  ctx =>
    modlogsEnabled(ctx)
      ? '✅ Deleted Posts Enabled '
      : '❌ Deleted Posts Disabled',
  'modlogs',
  {
    do: async ctx => {
      await ctx.answerCbQuery();

      handleNotificationToggle(ctx);

      return true;
    },
  },
);

notificationsMenu.interact('↩ Go Back', 'back', {
  do: async ctx => {
    await ctx.answerCbQuery();
    return '/main/';
  },
});

export default notificationsMenu;
