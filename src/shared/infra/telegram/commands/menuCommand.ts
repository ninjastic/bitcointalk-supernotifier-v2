import { Context } from 'telegraf/typings';

import { mainMenuMiddleware } from '../menus';

import ISession from '../@types/ISession';

interface MenuContext extends Context {
  session: ISession;
}

const menuCommand = async (ctx: MenuContext): Promise<void> => {
  if (ctx.session.username && ctx.session.userId) {
    await mainMenuMiddleware.replyToContext(ctx);

    return;
  }

  await ctx.reply(
    "I can't find your session with this Telegram.\n\nPlease run /start to initiate.",
  );
};

export default menuCommand;
