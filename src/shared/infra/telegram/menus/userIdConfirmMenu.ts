import { Context } from 'telegraf';
import { MenuTemplate } from 'telegraf-inline-menu';

import bot from '../index';

import ISession from '../@types/ISession';

import { configureMentionsMenuMiddleware } from './index';

interface MenuContext extends Context {
  session: ISession;
}

const userIdConfirmMenu = new MenuTemplate<MenuContext>(async ctx => {
  const userId = Number(ctx.message.text.trim());

  ctx.session.userId = userId;
  await bot.session.saveSession(bot.session.getSessionKey(ctx), ctx.session);

  return {
    text: `Is your UID <b>${userId}</b>?`,
    parse_mode: 'HTML',
  };
});

userIdConfirmMenu.interact('Yes', 'yes', {
  do: async ctx => {
    await ctx.answerCbQuery();

    return false;
  },
});

userIdConfirmMenu.interact('No', 'no', {
  joinLastRow: true,
  do: async ctx => {
    await ctx.answerCbQuery();

    return false;
  },
});

export const handleUserIdConfirmAnswer = async (
  ctx: MenuContext,
): Promise<void> => {
  const callback = ctx.callbackQuery;

  if (callback.data === '/prompt/userId/no') {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await ctx.reply('What is your UID, then?');

    return;
  }

  if (callback.data === '/prompt/userId/yes') {
    ctx.session.waitingForUserId = false;
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await bot.session.saveSession(bot.session.getSessionKey(ctx), ctx.session);
  }

  await configureMentionsMenuMiddleware.replyToContext(ctx);
};

export default userIdConfirmMenu;
