import { HearsContext } from 'grammy';
import IMenuContext from '../@types/IMenuContext';
import { initialSession } from '../bot';

const resetCommand = async (ctx: HearsContext<IMenuContext>): Promise<void> => {
  if (ctx.chat.type === 'private') {
    ctx.session = initialSession();
    ctx.conversation.exit();
    await ctx.reply('Reset...');
  }
};

export default resetCommand;
