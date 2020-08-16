import { Context } from 'telegraf';
import { MenuTemplate } from 'telegraf-inline-menu';

import ISession from '../@types/ISession';
import notificationsMenu from './notificationsMenu';

interface MenuContext extends Context {
  session: ISession;
}

const mainMenu = new MenuTemplate<MenuContext>(async (ctx: MenuContext) => {
  return {
    text: `Hello, <b>${ctx.session.username}</b>.\nWhat do you want to do now?`,
    parse_mode: 'HTML',
  };
});

mainMenu.submenu('📗 Tracked Topics', 'trackedTopics', notificationsMenu, {
  hide: () => true,
});

mainMenu.submenu('🔔 Notifications', 'notifications', notificationsMenu);

export default mainMenu;
