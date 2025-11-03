import type { CommandContext } from 'grammy';
import { container } from 'tsyringe';

import type IMenuContext from '../@types/IMenuContext';
import SendGlobalNotificationService from '../services/notifications/SendGlobalNotificationService';

const alertCommand = async (ctx: CommandContext<IMenuContext>): Promise<void> => {
  if (String(ctx.chat.id) !== '608520255') {
    return;
  }

  const sendGlobalNotification = container.resolve(SendGlobalNotificationService);
  const message = ctx.match;

  await sendGlobalNotification.execute(message).catch(async () => {
    await ctx.reply('Something went wrong.');
  });
};

export default alertCommand;
