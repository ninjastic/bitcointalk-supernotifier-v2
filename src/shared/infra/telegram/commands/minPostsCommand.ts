import { container } from 'tsyringe';
import type { HearsContext } from 'grammy';

import type IMenuContext from '../@types/IMenuContext';

import SaveCacheService from '../../../container/providers/services/SaveCacheService';

const minPostsCommand = async (ctx: HearsContext<IMenuContext>): Promise<void> => {
  const saveCache = container.resolve(SaveCacheService);

  const value = Number(ctx.match[1]);
  const telegram_id = ctx.message.from.id;

  if (Number.isNaN(value)) {
    await ctx.reply('Are you sure you chose a valid number?');
  } else {
    await saveCache.execute(`${telegram_id}:minTrackedBoardAuthorPostCount`, value);

    await ctx.reply(
      `Done! You will only get notifications about new topics from users with a minimum post count of <b>${value}</b>`,
      {
        parse_mode: 'HTML'
      }
    );
  }
};

export default minPostsCommand;
