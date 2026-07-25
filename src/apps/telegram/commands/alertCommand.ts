import type IUsersRepository from '##/modules/users/repositories/IUsersRepository';
import type ICacheProvider from '##/platform/cache/providers/models/ICacheProvider';
import type { CommandContext } from 'grammy';

import { ADMIN_TELEGRAM_ID } from '##/config/admin';
import { InlineKeyboard } from 'grammy';
import { randomUUID } from 'node:crypto';
import { container } from 'tsyringe';

import type IMenuContext from '../types/IMenuContext';
import { pendingAlertKey } from '../callbacks/handle-alert-confirmation';

const ALERT_PENDING_TTL_SECONDS = 600;
function isAdmin(ctx: IMenuContext): boolean {
  return String(ctx.chat.id) === String(ADMIN_TELEGRAM_ID);
}

async function alertCommand(ctx: CommandContext<IMenuContext>): Promise<void> {
  const cacheRepository = container.resolve<ICacheProvider>('CacheRepository');
  const usersRepository = container.resolve<IUsersRepository>('UsersRepository');

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
  const totalUsers = (await usersRepository.findAll(true)).length;

  await cacheRepository.save(pendingAlertKey(id), message, 'EX', ALERT_PENDING_TTL_SECONDS);

  const keyboard = new InlineKeyboard()
    .text('Send', `alert-confirm:send:${id}`)
    .text('Cancel', `alert-confirm:cancel:${id}`);

  await ctx.reply(`Send this global notification to ${totalUsers} users?`, {
    reply_markup: keyboard,
  });
}

export default alertCommand;
