import { CommandContext } from 'grammy';
import IMenuContext from '../@types/IMenuContext';

const infoCommand = async (ctx: CommandContext<IMenuContext>): Promise<void> => {
  const data = JSON.stringify({ id: ctx.chat.id, ...ctx.session });
  await ctx.reply(`<code>${data}</code>`, { parse_mode: 'HTML' });
};

export default infoCommand;
