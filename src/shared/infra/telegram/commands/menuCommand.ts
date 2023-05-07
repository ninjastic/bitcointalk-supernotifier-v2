import { CommandContext } from 'grammy';
import { replyMenuToContext } from 'grammy-inline-menu';

import IMenuContext from '../@types/IMenuContext';
import { mainMenu } from '../menus/mainMenu';

const menuCommand = async (ctx: CommandContext<IMenuContext>): Promise<void> => {
  await replyMenuToContext(mainMenu, ctx, '/');
};

export default menuCommand;
