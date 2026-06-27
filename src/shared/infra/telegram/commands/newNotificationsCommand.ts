import type { CommandContext } from 'grammy';

import { container } from 'tsyringe';

import type IMenuContext from '../@types/IMenuContext';

import UsersRepository from '../../../../modules/users/infra/typeorm/repositories/UsersRepository';

function parseNewNotificationsMode(
  input: string | RegExpMatchArray | undefined,
): boolean | null | undefined {
  const value = String(input || '')
    .trim()
    .toLowerCase();

  if (!value) return undefined;
  if (value === 'on') return true;
  if (value === 'off') return false;

  return null;
}

async function newNotificationsCommand(ctx: CommandContext<IMenuContext>): Promise<void> {
  if (ctx.msg.chat.type === 'group') {
    const user = await ctx.api.getChatMember(ctx.chat.id, ctx.from!.id);
    if (user.status !== 'creator' && user.status !== 'administrator') {
      return;
    }
  }

  const usersRepository = container.resolve(UsersRepository);
  const telegramId = String(ctx.chat.id);
  const user = await usersRepository.findByTelegramId(telegramId);

  if (!user) {
    await ctx.reply('Run /start before changing notification format.');
    return;
  }

  const explicitMode = parseNewNotificationsMode(ctx.match);
  if (explicitMode === null) {
    await ctx.reply('Usage: /newnotifications, /newnotifications on, or /newnotifications off');
    return;
  }

  user.enable_new_notifications = explicitMode ?? !user.enable_new_notifications;
  await usersRepository.save(user);
  ctx.session.newNotifications = user.enable_new_notifications;

  const format = user.enable_new_notifications ? 'new rich HTML' : 'legacy Telegram HTML';
  await ctx.reply(`Done! Notifications will now use ${format}.`);
}

export default newNotificationsCommand;
