import type { CommandContext } from 'grammy';

import type IMenuContext from '../@types/IMenuContext';

import { mainMenu } from '../menus/mainMenu';
import { mainMenuHtml, replyHtmlMenu } from '../menus/menu-utils';

async function menuCommand(ctx: CommandContext<IMenuContext>): Promise<void> {
  await replyHtmlMenu(ctx, mainMenuHtml(ctx), mainMenu);
}

export default menuCommand;
