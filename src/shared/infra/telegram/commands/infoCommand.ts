import type { HearsContext } from 'grammy';

import type IMenuContext from '../@types/IMenuContext';

async function infoCommand(ctx: HearsContext<IMenuContext>): Promise<void> {
  const data = JSON.stringify({ chat: ctx.chat.id, id: ctx.from.id, ...ctx.session });
  await ctx.reply(`<code>${data}</code>`, { parse_mode: 'HTML' });
}

export default infoCommand;
