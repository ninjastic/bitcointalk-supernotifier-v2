import { container } from 'tsyringe';
import { MenuTemplate } from 'grammy-inline-menu';

import IMenuContext from '../@types/IMenuContext';
import UpdateUserNotificationService from '../services/UpdateUserNotificationService';

const notificationsMenu = new MenuTemplate<IMenuContext>(() => ({
  text: `<b>Notifications</b>\n\nEnable or disable specific notifications.`,
  parse_mode: 'HTML'
}));

const handleNotificationToggle = async (ctx: IMenuContext) => {
  const updateUserNotification = container.resolve(UpdateUserNotificationService);

  if (ctx.update.callback_query.data === '/notifications/merits') {
    ctx.session.merits = !ctx.session.merits;
    await updateUserNotification.execute(String(ctx.update.callback_query.from.id), 'merits', ctx.session.merits);
  }

  if (ctx.update.callback_query.data === '/notifications/mentions') {
    ctx.session.mentions = !ctx.session.mentions;
    await updateUserNotification.execute(String(ctx.update.callback_query.from.id), 'mentions', ctx.session.mentions);
  }

  if (ctx.update.callback_query.data === '/notifications/modlogs') {
    ctx.session.modlogs = !ctx.session.modlogs;
    await updateUserNotification.execute(String(ctx.update.callback_query.from.id), 'modlogs', ctx.session.modlogs);
  }

  if (ctx.update.callback_query.data === '/notifications/track_topics') {
    ctx.session.track_topics = !ctx.session.track_topics;
    await updateUserNotification.execute(
      String(ctx.update.callback_query.from.id),
      'track_topics',
      ctx.session.track_topics
    );
  }

  await ctx.answerCallbackQuery();
};

const mentionsEnabled = (ctx: IMenuContext) => ctx.session.mentions;
const meritsEnabled = (ctx: IMenuContext) => ctx.session.merits;
const modlogsEnabled = (ctx: IMenuContext) => ctx.session.modlogs;
const trackTopicsEnabled = (ctx: IMenuContext) => ctx.session.track_topics;

notificationsMenu.interact(
  ctx => (mentionsEnabled(ctx) ? '✅ Mentions Enabled ' : '🚫 Mentions Disabled'),
  'mentions',
  {
    do: async ctx => {
      await ctx.answerCallbackQuery();
      await handleNotificationToggle(ctx);

      return true;
    }
  }
);

notificationsMenu.interact(ctx => (meritsEnabled(ctx) ? '✅ Merits Enabled' : '🚫 Merits Disabled'), 'merits', {
  do: async ctx => {
    await ctx.answerCallbackQuery();
    await handleNotificationToggle(ctx);

    return true;
  }
});

notificationsMenu.interact(
  ctx => (modlogsEnabled(ctx) ? '✅ Deleted Posts Enabled ' : '🚫 Deleted Posts Disabled'),
  'modlogs',
  {
    do: async ctx => {
      await ctx.answerCallbackQuery();
      await handleNotificationToggle(ctx);

      return true;
    }
  }
);

notificationsMenu.interact(
  ctx => (trackTopicsEnabled(ctx) ? '✅ Auto-Track Own Topics Enabled ' : '🚫 Auto-Track Own Topics Disabled'),
  'track_topics',
  {
    do: async ctx => {
      await ctx.answerCallbackQuery();
      await handleNotificationToggle(ctx);

      return true;
    }
  }
);

notificationsMenu.interact('↩ Go Back', 'back', {
  do: async ctx => {
    await ctx.answerCallbackQuery();
    return '/';
  }
});

export default notificationsMenu;
