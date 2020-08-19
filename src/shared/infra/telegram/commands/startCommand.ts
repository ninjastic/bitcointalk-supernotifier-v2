import { Context } from 'telegraf/typings';

import bot from '../index';

import ISession from '../@types/ISession';

interface StartContext extends Context {
  session: ISession;
}

const startCommand = async (ctx: StartContext): Promise<void> => {
  await ctx.reply(`Hello! Welcome to the BitcoinTalk SuperNotifier V2!`);
  await ctx.reply('What is your BitcoinTalk username?');

  ctx.session.waitingForUsername = true;
  ctx.session.waitingForUserId = false;
  await bot.session.saveSession(bot.session.getSessionKey(ctx), ctx.session);
};

export default startCommand;
