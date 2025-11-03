import { MenuMiddleware, MenuTemplate } from 'grammy-inline-menu';

import type IMenuContext from '../@types/IMenuContext';

import trackedTopicsMenu from './trackedTopicsMenu';
import trackedPhrasesMenu from './trackedPhrasesMenu';
import trackedBoardsMenu from './trackedBoardsMenu';
import trackedUsersMenu from './trackedUsersMenu';
import ignoredUsersMenu from './ignoredUsersMenu';
import ignoredTopicsMenu from './ignoredTopicsMenu';
import ignoredBoardsMenu from './ignoredBoardsMenu';
import notificationsMenu from './notificationsMenu';
import aboutMenu from './aboutMenu';

function getUsername(ctx: IMenuContext): string {
  if (ctx.session.isGroup) return ctx.from.username || ctx.from.first_name;
  if (ctx.session.username) return ctx.session.username;
  return ctx.from.username || ctx.from.first_name;
}

const mainMenu = new MenuTemplate<IMenuContext>(async (ctx: IMenuContext) => ({
  text: `Hello, <b>${getUsername(
    ctx
  )}</b>.\nNice to see you. What do you want to do now?\n\nRun /help to see all available commands.`,
  parse_mode: 'HTML'
}));

mainMenu.submenu('💬 Tracked Phrases', 'tp', trackedPhrasesMenu);
mainMenu.submenu('📗 Tracked Topics', 'tt', trackedTopicsMenu);
mainMenu.submenu('🚫 Ignored Topics', 'it', ignoredTopicsMenu, { joinLastRow: true });
mainMenu.submenu('🗂️ Tracked Boards', 'tb', trackedBoardsMenu);
mainMenu.submenu('🚫 Ignored Boards', 'ib', ignoredBoardsMenu, { joinLastRow: true });
mainMenu.submenu('✍️ Tracked Users', 'tu', trackedUsersMenu);
mainMenu.submenu('🚫 Ignored Users', 'iu', ignoredUsersMenu, { joinLastRow: true });
mainMenu.submenu('🔔 Notifications', 'notifications', notificationsMenu, { hide: ctx => ctx.session.isGroup });
mainMenu.submenu('👋 About', 'about', aboutMenu, { joinLastRow: true });

const mainMenuMiddleware = new MenuMiddleware('/', mainMenu);

export { mainMenu, mainMenuMiddleware };
