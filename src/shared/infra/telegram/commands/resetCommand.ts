import type { CommandContext } from 'grammy';

import type IMenuContext from '../@types/IMenuContext';

import { initialSession } from '../bot';

async function resetCommand(ctx: CommandContext<IMenuContext>): Promise<void> {
  if (ctx.chat.type === 'private') {
    ctx.session = initialSession();
    ctx.conversation.exit();
    await ctx.reply('Reset...');
  }
}

export default resetCommand;
