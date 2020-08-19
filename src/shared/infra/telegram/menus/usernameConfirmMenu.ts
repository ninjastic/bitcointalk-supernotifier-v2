import { Context } from 'telegraf';
import { MenuTemplate } from 'telegraf-inline-menu';

import bot from '../index';

import ISession from '../@types/ISession';

interface MenuContext extends Context {
  session: ISession;
}

const usernameConfirmMenu = new MenuTemplate<MenuContext>(async ctx => {
  const username = ctx.message.text.trim();

  ctx.session.username = username;
  await bot.session.saveSession(bot.session.getSessionKey(ctx), ctx.session);

  return {
    text: `Is your username <b>${username}</b>?`,
    parse_mode: 'HTML',
  };
});

usernameConfirmMenu.interact('Yes', 'yes', {
  do: async ctx => {
    await ctx.answerCbQuery();

    return false;
  },
});

usernameConfirmMenu.interact('No', 'no', {
  joinLastRow: true,
  do: async ctx => {
    await ctx.answerCbQuery();

    return false;
  },
});

export const handleUsernameConfirmAnswer = async (
  ctx: MenuContext,
): Promise<void> => {
  const callback = ctx.callbackQuery;

  if (callback.data === '/prompt/username/no') {
    await ctx.deleteMessage();
    await ctx.reply('What is your username, then?');

    return;
  }

  if (callback.data === '/prompt/username/yes') {
    ctx.session.waitingForUsername = false;
    ctx.session.waitingForUserId = true;
    await bot.session.saveSession(bot.session.getSessionKey(ctx), ctx.session);

    await ctx.deleteMessage();
    await ctx.reply('What is your Bitcointalk UID?');
  }
};

export default usernameConfirmMenu;
