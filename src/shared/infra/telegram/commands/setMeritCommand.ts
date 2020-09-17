import { container } from 'tsyringe';
import { Context } from 'telegraf/typings';
import { Message } from 'telegraf/typings/telegram-types';

import ISession from '../@types/ISession';

import SaveCacheService from '../../../container/providers/services/SaveCacheService';

interface MenuContext extends Context {
  session: ISession;
}

const setMeritCommand = async (ctx: MenuContext): Promise<Message> => {
  const saveCache = container.resolve(SaveCacheService);

  const value = Number(ctx.match[1]);
  const telegram_id = ctx.message.from.id;

  if (!Number.isInteger(value)) {
    return ctx.reply(
      'Something went wrong... Are you sure you choose a valid number?',
    );
  }

  await saveCache.execute(`meritCount:${telegram_id}`, value);

  return ctx.reply(`Done! Your merit count is now: <b>${value}</b>`, {
    parse_mode: 'HTML',
  });
};

export default setMeritCommand;
