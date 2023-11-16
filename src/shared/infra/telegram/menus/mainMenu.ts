import { MenuMiddleware, MenuTemplate } from 'grammy-inline-menu';

import IMenuContext from '../@types/IMenuContext';

import trackedTopicsMenu from './trackedTopicsMenu';
import trackedPhrasesMenu from './trackedPhrasesMenu';
import trackedBoardsMenu from './trackedBoardsMenu';
import trackedUsersMenu from './trackedUsersMenu';
import ignoredUsersMenu from './ignoredUsersMenu';
import ignoredTopicsMenu from './ignoredTopicsMenu';
import notificationsMenu from './notificationsMenu';
import aboutMenu from './aboutMenu';

const mainMenu = new MenuTemplate<IMenuContext>(async (ctx: IMenuContext) => ({
  text: `Hello, <b>${
    ctx.session.isGroup || !ctx.session.username ? ctx.from.username : ctx.session.username
  }</b>.\nNice to see you. What do you want to do now?`,
  parse_mode: 'HTML'
}));

mainMenu.submenu('📗 Tracked Topics', 'tt', trackedTopicsMenu);
mainMenu.submenu('💬 Tracked Phrases', 'tp', trackedPhrasesMenu, { joinLastRow: true });
mainMenu.submenu('🗂️ Tracked Boards', 'tb', trackedBoardsMenu);
mainMenu.submenu('✍️ Tracked Users', 'tu', trackedUsersMenu, { joinLastRow: true });
mainMenu.submenu('🚫 Ignored Topics', 'it', ignoredTopicsMenu);
mainMenu.submenu('🚫 Ignored Users', 'iu', ignoredUsersMenu, { joinLastRow: true });
mainMenu.submenu('🔔 Notifications', 'notifications', notificationsMenu, { hide: ctx => ctx.session.isGroup });
mainMenu.submenu('👋 About', 'about', aboutMenu, { joinLastRow: true });

const mainMenuMiddleware = new MenuMiddleware('/', mainMenu);

export { mainMenu, mainMenuMiddleware };
