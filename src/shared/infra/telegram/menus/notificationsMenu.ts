import { Menu } from '@grammyjs/menu';
import { container } from 'tsyringe';

import type IMenuContext from '../@types/IMenuContext';

import UpdateUserNotificationService from '../services/UpdateUserNotificationService';
import { editHtml } from './menu-utils';

export const NOTIFICATIONS_MENU_HTML =
  '<b>Notifications</b>\n\nEnable or disable specific notifications.';

type NotificationField =
  | 'mentions'
  | 'merits'
  | 'modlogs'
  | 'track_topics'
  | 'onlyDirectMentions'
  | 'ignoreNestedQuotes';

async function toggleNotification(ctx: IMenuContext, field: NotificationField) {
  const updateUserNotification = container.resolve(UpdateUserNotificationService);

  ctx.session[field] = !ctx.session[field];
  await updateUserNotification.execute(String(ctx.chat.id), field, ctx.session[field]);
  ctx.menu.update();
}

const notificationsMenu = new Menu<IMenuContext>('ntm')
  .text(
    (ctx) => (ctx.session.mentions ? '✅ Mentions Enabled ' : '🚫 Mentions Disabled'),
    (ctx) => toggleNotification(ctx, 'mentions'),
  )
  .row()
  .text(
    (ctx) => (ctx.session.merits ? '✅ Merits Enabled' : '🚫 Merits Disabled'),
    (ctx) => toggleNotification(ctx, 'merits'),
  )
  .row()
  .text(
    (ctx) => (ctx.session.modlogs ? '✅ Deleted Posts Enabled ' : '🚫 Deleted Posts Disabled'),
    (ctx) => toggleNotification(ctx, 'modlogs'),
  )
  .row()
  .text(
    (ctx) =>
      ctx.session.track_topics
        ? '✅ Auto-Track Own Topics Enabled '
        : '🚫 Auto-Track Own Topics Disabled',
    (ctx) => toggleNotification(ctx, 'track_topics'),
  )
  .row()
  .text(
    (ctx) =>
      ctx.session.onlyDirectMentions
        ? '✅ Only Direct Mentions Enabled '
        : '🚫 Only Direct Mentions Disabled',
    (ctx) => toggleNotification(ctx, 'onlyDirectMentions'),
  )
  .row()
  .text(
    (ctx) =>
      ctx.session.ignoreNestedQuotes
        ? '✅ Ignore Nested Quotes Enabled '
        : '🚫 Ignore Nested Quotes Disabled',
    (ctx) => toggleNotification(ctx, 'ignoreNestedQuotes'),
  )
  .row()
  .back('↩ Go Back', async (ctx) => {
    await editHtml(ctx, '<b>Notification settings</b>\n\nManage global notification preferences.');
  });

export default notificationsMenu;
