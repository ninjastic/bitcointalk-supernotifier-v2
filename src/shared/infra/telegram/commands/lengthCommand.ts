import type { HearsContext } from 'grammy';
import { container } from 'tsyringe';

import type IMenuContext from '../@types/IMenuContext';
import type RedisProvider from '../../../container/providers/implementations/RedisProvider';

const lengthCommand = async (ctx: HearsContext<IMenuContext>): Promise<void> => {
  const redisProvider = container.resolve<RedisProvider>('CacheRepository');

  const length = Number(ctx.match?.at(1));

  if (Number.isNaN(length)) {
    await ctx.reply("Invalid length value. Make sure it's a valid number.");
    return;
  }

  if (length > 1000) {
    await ctx.reply('Invalid length value. The maximum allowed is 1000.');
    return;
  }

  await redisProvider.save(`${ctx.chat.id}:postLength`, length);
  await ctx.reply(`Done! New length: ${length}`);
};

export default lengthCommand;
