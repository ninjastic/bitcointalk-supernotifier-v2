import { Menu } from '@grammyjs/menu';

import type IMenuContext from '../@types/IMenuContext';

import aboutMenu, { ABOUT_MENU_HTML } from './aboutMenu';
import { advancedMatchListMenu, LIST_HTML } from './advancedMatchesMenu';
import ignoredBoardsMenu, { IGNORED_BOARDS_MENU_HTML } from './ignoredBoardsMenu';
import ignoredTopicsMenu, { IGNORED_TOPICS_MENU_HTML } from './ignoredTopicsMenu';
import ignoredUsersMenu, { IGNORED_USERS_MENU_HTML } from './ignoredUsersMenu';
import { editHtml, editRich, mainMenuHtml } from './menu-utils';
import notificationsMenu, { NOTIFICATIONS_MENU_HTML } from './notificationsMenu';
import trackedBoardsMenu, { TRACKED_BOARDS_MENU_HTML } from './trackedBoardsMenu';
import trackedPhrasesMenu, { TRACKED_PHRASES_MENU_HTML } from './trackedPhrasesMenu';
import trackedTopicsMenu, { TRACKED_TOPICS_MENU_HTML } from './trackedTopicsMenu';
import trackedUsersMenu, { TRACKED_USERS_MENU_HTML } from './trackedUsersMenu';

const notifyMeMenu = new Menu<IMenuContext>('nm')
  .submenu('🔎 Advanced regex matches', 'aml', async (ctx) => {
    await editRich(ctx, LIST_HTML);
  })
  .row()
  .submenu('💬 Phrases in posts', 'tpm', async (ctx) => {
    ctx.session.page = 0;
    await editHtml(ctx, TRACKED_PHRASES_MENU_HTML);
  })
  .row()
  .submenu('📗 Topic replies', 'ttm', async (ctx) => {
    ctx.session.page = 0;
    await editHtml(ctx, TRACKED_TOPICS_MENU_HTML);
  })
  .row()
  .submenu('🗂️ New topics on boards', 'tbm', async (ctx) => {
    ctx.session.page = 0;
    await editHtml(ctx, TRACKED_BOARDS_MENU_HTML);
  })
  .row()
  .submenu('✍️ Posts by users', 'tum', async (ctx) => {
    ctx.session.page = 0;
    await editHtml(ctx, TRACKED_USERS_MENU_HTML);
  })
  .row()
  .back('↩ Go Back', async (ctx) => {
    await editHtml(ctx, mainMenuHtml(ctx));
  });

const dontNotifyMeMenu = new Menu<IMenuContext>('im')
  .submenu('🚫 Topics', 'itm', async (ctx) => {
    ctx.session.page = 0;
    await editHtml(ctx, IGNORED_TOPICS_MENU_HTML);
  })
  .row()
  .submenu('🚫 Boards', 'ibm', async (ctx) => {
    ctx.session.page = 0;
    await editHtml(ctx, IGNORED_BOARDS_MENU_HTML);
  })
  .row()
  .submenu('🚫 Users', 'ium', async (ctx) => {
    ctx.session.page = 0;
    await editHtml(ctx, IGNORED_USERS_MENU_HTML);
  })
  .row()
  .back('↩ Go Back', async (ctx) => {
    await editHtml(ctx, mainMenuHtml(ctx));
  });

const settingsMenu = new Menu<IMenuContext>('sm')
  .submenu('🔔 Notification toggles', 'ntm', async (ctx) => {
    await editHtml(ctx, NOTIFICATIONS_MENU_HTML);
  })
  .row()
  .back('↩ Go Back', async (ctx) => {
    await editHtml(ctx, mainMenuHtml(ctx));
  });

const mainMenu = new Menu<IMenuContext>('mm')
  .submenu('🔔 Notify me about...', 'nm', async (ctx) => {
    await editHtml(ctx, '<b>Notify me about...</b>\n\nChoose what should trigger notifications.');
  })
  .row()
  .submenu("🚫 Don't notify me about...", 'im', async (ctx) => {
    await editHtml(ctx, "<b>Don't notify me about...</b>\n\nChoose what should be ignored.");
  })
  .row()
  .submenu('⚙️ Notification settings', 'sm', async (ctx) => {
    await editHtml(ctx, '<b>Notification settings</b>\n\nManage global notification preferences.');
  })
  .row()
  .submenu('ℹ️ Help / About', 'abm', async (ctx) => {
    await editHtml(ctx, ABOUT_MENU_HTML);
  });

mainMenu.register([notifyMeMenu, dontNotifyMeMenu, settingsMenu, aboutMenu]);
notifyMeMenu.register([
  advancedMatchListMenu,
  trackedPhrasesMenu,
  trackedTopicsMenu,
  trackedBoardsMenu,
  trackedUsersMenu,
]);
dontNotifyMeMenu.register([ignoredTopicsMenu, ignoredBoardsMenu, ignoredUsersMenu]);
settingsMenu.register(notificationsMenu);

export { mainMenu };
