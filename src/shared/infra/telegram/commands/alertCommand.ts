import { CommandContext } from 'grammy';
import { container } from 'tsyringe';

import IMenuContext from '../@types/IMenuContext';
import SendGlobalNotificationService from '../services/SendGlobalNotificationService';

const alertCommand = async (ctx: CommandContext<IMenuContext>): Promise<void> => {
  if (String(ctx.from.id) === '608520255') {
    const sendGlobalNotification = container.resolve(SendGlobalNotificationService);

    const message = ctx.message.text.replace('/alert ', '');

    await sendGlobalNotification
      .execute(message)
      .then(async () => {
        await ctx.reply('The messages started to be sent.');
      })
      .catch(async () => {
        await ctx.reply('Something went wrong.');
      });
  }
};

export default alertCommand;
