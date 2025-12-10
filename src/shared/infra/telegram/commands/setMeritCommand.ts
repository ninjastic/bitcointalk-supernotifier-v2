import type { HearsContext } from 'grammy';

import { container } from 'tsyringe';

import type IMenuContext from '../@types/IMenuContext';

import SaveCacheService from '../../../container/providers/services/SaveCacheService';

async function setMeritCommand(ctx: HearsContext<IMenuContext>): Promise<void> {
  const saveCache = container.resolve(SaveCacheService);

  const value = Number(ctx.match[1]);
  const telegram_id = ctx.message.from.id;

  if (Number.isNaN(value)) {
    await ctx.reply('Are you sure you chose a valid number?');
  }
  else {
    await saveCache.execute(`meritCount:${telegram_id}`, value);

    await ctx.reply(`Done! Your merit count is now: <b>${value}</b>`, {
      parse_mode: 'HTML',
    });
  }
}

export default setMeritCommand;
