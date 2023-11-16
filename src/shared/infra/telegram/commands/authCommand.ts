import { HearsContext } from 'grammy';
import jwt from 'jsonwebtoken';

import IMenuContext from '../@types/IMenuContext';
import redis from '../../../services/redis';

const authCommand = async (ctx: HearsContext<IMenuContext>): Promise<void> => {
  const code = Number(ctx.match[1]);

  if (!code || Number.isNaN(code)) {
    await ctx.reply('Code not valid.');
    return;
  }

  const codeExists = await redis.get(`code:${code}`);

  if (!codeExists) {
    await ctx.reply('Code session not found.');
    return;
  }

  const token = jwt.sign({ telegram_id: ctx.chat.id }, '123');
  await redis.set(`code:${code}`, JSON.stringify({ token }));

  await ctx.reply('Authenticated! Go back to your browser.');
};

export default authCommand;
