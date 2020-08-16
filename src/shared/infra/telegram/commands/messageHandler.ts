import { Context } from 'telegraf/typings';

import {
  usernameConfirmMenuMiddleware,
  userIdConfirmMenuMiddleware,
} from '../menus';

import ISession from '../@types/ISession';

interface MessageHandlerContext extends Context {
  session: ISession;
}

const messageHandler = async (ctx: MessageHandlerContext): Promise<void> => {
  if (ctx.session.waitingForUsername) {
    const username = ctx.update.message.text.trim();

    if (!username) {
      await ctx.reply(`Sorry, can you say that again?`);

      return;
    }

    await usernameConfirmMenuMiddleware.replyToContext(ctx);
  }

  if (ctx.session.waitingForUserId) {
    const userId = Number(ctx.update.message.text.trim());

    if (Number.isNaN(userId)) {
      await ctx.reply("This doesn't seem right. Please enter your UID.");

      return;
    }

    await userIdConfirmMenuMiddleware.replyToContext(ctx);
  }
};

export default messageHandler;
