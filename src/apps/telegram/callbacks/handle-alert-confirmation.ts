import type ICacheProvider from '##/platform/cache/providers/models/ICacheProvider';
import type IMenuContext from '##/apps/telegram/types/IMenuContext';
import type { Api, Bot, RawApi } from 'grammy';

import { ADMIN_TELEGRAM_ID } from '##/config/admin';
import SendGlobalNotificationService from '##/apps/telegram/notifications/SendGlobalNotificationService';
import { container } from 'tsyringe';

export function pendingAlertKey(id: string): string {
  return `globalNotificationPending:${id}`;
}

function isAdmin(ctx: IMenuContext): boolean {
  return String(ctx.chat.id) === String(ADMIN_TELEGRAM_ID);
}

export function handleAlertConfirmation(bot: Bot<IMenuContext, Api<RawApi>>): void {
  const cache = container.resolve<ICacheProvider>('CacheRepository');

  bot.callbackQuery(/^alert-confirm:(send|cancel):(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery('Not allowed');
      return;
    }

    const [, action, id] = ctx.match;
    const key = pendingAlertKey(id);

    if (action === 'cancel') {
      await cache.invalidate(key);
      await ctx.answerCallbackQuery('Cancelled');
      await ctx.editMessageText('Global notification cancelled.');
      return;
    }

    const message = await cache.recover<string>(key);

    if (!message) {
      await ctx.answerCallbackQuery('This confirmation expired.');
      await ctx.editMessageText('This global notification confirmation expired.');
      return;
    }

    await cache.invalidate(key);
    await ctx.answerCallbackQuery('Sending...');
    await ctx.editMessageText('Sending global notification...');

    const sendGlobalNotification = container.resolve(SendGlobalNotificationService);
    await sendGlobalNotification.execute(message).catch(async () => {
      await ctx.reply('Something went wrong.');
    });
  });
}
