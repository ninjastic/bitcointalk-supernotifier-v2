import { Context } from 'telegraf/typings';
import { container } from 'tsyringe';

import ISession from '../@types/ISession';

import SendGlobalNotificationService from '../services/SendGlobalNotificationService';

interface MenuContext extends Context {
  session: ISession;
}

const alertCommand = async (ctx: MenuContext): Promise<void> => {
  if (ctx.from.id === 608520255) {
    const sendGlobalNotification = container.resolve(
      SendGlobalNotificationService,
    );

    const message = ctx.match[1];

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
