import { HearsContext } from 'grammy';
import IMenuContext from '../@types/IMenuContext';
import { initialSession } from '../bot';

const resetCommand = async (ctx: HearsContext<IMenuContext>): Promise<void> => {
  ctx.session = initialSession();
  ctx.conversation.exit('setup');
  ctx.conversation.exit('addTrackedBoard');
  ctx.conversation.exit('addTrackedUser');

  await ctx.reply('Reseted...');
};

export default resetCommand;
