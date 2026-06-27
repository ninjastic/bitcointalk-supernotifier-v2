import type IUsersRepository from '##/modules/users/repositories/IUsersRepository';
import type ICacheProvider from '##/shared/container/providers/models/ICacheProvider';
import type { Api, Bot, CommandContext, RawApi } from 'grammy';

import { ADMIN_TELEGRAM_ID } from '##/config/admin';
import { InlineKeyboard } from 'grammy';
import { randomUUID } from 'node:crypto';
import { container } from 'tsyringe';

import type IMenuContext from '../@types/IMenuContext';

import SendGlobalNotificationService from '../services/notifications/SendGlobalNotificationService';

const ALERT_PENDING_TTL_SECONDS = 600;
const ALERT_PENDING_KEY_PREFIX = 'globalNotificationPending';

function pendingAlertKey(id: string): string {
  return `${ALERT_PENDING_KEY_PREFIX}:${id}`;
}

function isAdmin(ctx: IMenuContext): boolean {
  return String(ctx.chat.id) === String(ADMIN_TELEGRAM_ID);
}

async function alertCommand(ctx: CommandContext<IMenuContext>): Promise<void> {
  if (!isAdmin(ctx)) {
    return;
  }

  const message = ctx.match.trim();

  if (!message) {
    await ctx.reply('Usage: /alert <HTML message>');
    return;
  }

  try {
    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    await ctx.reply(
      `Telegram rejected this HTML message:\n\n${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }

  const id = randomUUID();
  const cacheRepository = container.resolve<ICacheProvider>('CacheRepository');
  const usersRepository = container.resolve<IUsersRepository>('UsersRepository');
  const totalUsers = (await usersRepository.findAll(true)).length;

  await cacheRepository.save(pendingAlertKey(id), message, 'EX', ALERT_PENDING_TTL_SECONDS);

  const keyboard = new InlineKeyboard()
    .text('Send', `alert-confirm:send:${id}`)
    .text('Cancel', `alert-confirm:cancel:${id}`);

  await ctx.reply(`Send this global notification to ${totalUsers} users?`, {
    reply_markup: keyboard,
  });
}

export function setupAlertConfirmationHandlers(bot: Bot<IMenuContext, Api<RawApi>>): void {
  bot.callbackQuery(/^alert-confirm:(send|cancel):(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery('Not allowed');
      return;
    }

    const [, action, id] = ctx.match;
    const cacheRepository = container.resolve<ICacheProvider>('CacheRepository');
    const key = pendingAlertKey(id);

    if (action === 'cancel') {
      await cacheRepository.invalidate(key);
      await ctx.answerCallbackQuery('Cancelled');
      await ctx.editMessageText('Global notification cancelled.');
      return;
    }

    const message = await cacheRepository.recover<string>(key);

    if (!message) {
      await ctx.answerCallbackQuery('This confirmation expired.');
      await ctx.editMessageText('This global notification confirmation expired.');
      return;
    }

    await cacheRepository.invalidate(key);
    await ctx.answerCallbackQuery('Sending...');
    await ctx.editMessageText('Sending global notification...');

    const sendGlobalNotification = container.resolve(SendGlobalNotificationService);

    await sendGlobalNotification.execute(message).catch(async () => {
      await ctx.reply('Something went wrong.');
    });
  });
}

export default alertCommand;
