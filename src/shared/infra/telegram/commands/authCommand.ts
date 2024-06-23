import { HearsContext } from 'grammy';

import IMenuContext from '../@types/IMenuContext';
import redis from '../../../services/redis';

const authCommand = async (ctx: HearsContext<IMenuContext>): Promise<void> => {
  const randCode = Math.floor(100000 + Math.random() * 900000);

  const redisKey = `authCode:${randCode}`;
  const redisValue = ctx.chat.id;

  await redis.set(redisKey, redisValue, 'EX', 60 * 30);

  await ctx.reply(`Your auth code is:\n\n<code>${randCode}</code>\n\nThis code expires in 30 minutes.`, {
    parse_mode: 'HTML'
  });
};

export default authCommand;
