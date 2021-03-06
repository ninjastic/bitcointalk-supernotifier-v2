import { Context } from 'telegraf';
import { MenuTemplate } from 'telegraf-inline-menu';

import ISession from '../@types/ISession';

import trackedTopicsMenu from './trackedTopicsMenu';
import trackedPhrasesMenu from './trackedPhrasesMenu';
import ignoredUsersMenu from './ignoredUsersMenu';
import ignoredTopicsMenu from './ignoredTopicsMenu';
import notificationsMenu from './notificationsMenu';
import aboutMenu from './aboutMenu';

interface MenuContext extends Context {
  session: ISession;
}

const mainMenu = new MenuTemplate<MenuContext>(async (ctx: MenuContext) => {
  return {
    text: `Hello, <b>${ctx.session.username}</b>.\nNice to see you. What do you want to do now?`,
    parse_mode: 'HTML',
  };
});

mainMenu.submenu('📗 Tracked Topics', 'tt', trackedTopicsMenu);
mainMenu.submenu('💬 Tracked Phrases', 'tp', trackedPhrasesMenu, {
  joinLastRow: true,
});
mainMenu.submenu('🚫 Ignored Topics', 'it', ignoredTopicsMenu);
mainMenu.submenu('🚫 Ignored Users', 'iu', ignoredUsersMenu, {
  joinLastRow: true,
});
mainMenu.submenu('🔔 Notifications', 'notifications', notificationsMenu);
mainMenu.submenu('👋 About', 'about', aboutMenu, { joinLastRow: true });

export default mainMenu;
