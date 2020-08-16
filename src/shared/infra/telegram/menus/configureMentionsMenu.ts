import { Context } from 'telegraf';
import { MenuTemplate } from 'telegraf-inline-menu';

import bot from '../index';

import ISession from '../@types/ISession';

import { configureMeritsMenuMiddleware } from '.';

interface MenuContext extends Context {
  session: ISession;
}

const configureMentionsMenu = new MenuTemplate<MenuContext>(async () => {
  return {
    text: `Do you want to be notified of new <b>mentions</b>?`,
    parse_mode: 'HTML',
  };
});

configureMentionsMenu.interact('Yes', 'yes', {
  do: async ctx => {
    await ctx.answerCbQuery();

    return false;
  },
});

configureMentionsMenu.interact('No', 'no', {
  joinLastRow: true,
  do: async ctx => {
    await ctx.answerCbQuery();

    return false;
  },
});

export const handleConfigureMentionsAnswer = async (
  ctx: MenuContext,
): Promise<void> => {
  const callback = ctx.callbackQuery;

  if (callback.data === '/prompt/mentions/no') {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    ctx.session.mentions = false;
    await bot.session.saveSession(bot.session.getSessionKey(ctx), ctx.session);

    await ctx.reply("We won't notify you of new mentions.");
  } else if (callback.data === '/prompt/mentions/yes') {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    ctx.session.mentions = true;
    await bot.session.saveSession(bot.session.getSessionKey(ctx), ctx.session);

    await ctx.reply('We will notify you of new mentions.');
  }

  await configureMeritsMenuMiddleware.replyToContext(ctx);
};

export default configureMentionsMenu;
