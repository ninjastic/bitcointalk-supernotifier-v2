import { CommandContext } from 'grammy';
import { replyMenuToContext } from 'grammy-inline-menu';

import IMenuContext from '../@types/IMenuContext';
import { mainMenu } from '../menus/mainMenu';

const menuCommand = async (ctx: CommandContext<IMenuContext>): Promise<void> => {
  if (ctx.session.username && ctx.session.userId) {
    await replyMenuToContext(mainMenu, ctx, '/');
    return;
  }

  await ctx.reply("I can't find your session with this Telegram.\n\nPlease run /start to initiate.");
};

export default menuCommand;
