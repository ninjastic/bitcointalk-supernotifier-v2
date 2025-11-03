import type { HearsContext } from 'grammy';
import type IMenuContext from '../@types/IMenuContext';

const infoCommand = async (ctx: HearsContext<IMenuContext>): Promise<void> => {
  const data = JSON.stringify({ chat: ctx.chat.id, id: ctx.from.id, ...ctx.session });
  await ctx.reply(`<code>${data}</code>`, { parse_mode: 'HTML' });
};

export default infoCommand;
