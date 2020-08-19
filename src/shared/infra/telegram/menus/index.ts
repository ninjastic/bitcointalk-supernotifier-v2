import { MenuMiddleware } from 'telegraf-inline-menu';

import usernameConfirmMenu from './usernameConfirmMenu';
import userIdConfirmMenu from './userIdConfirmMenu';
import configureMentionsMenu from './configureMentionsMenu';
import configureMeritsMenu from './configureMeritsMenu';

import mainMenu from './mainMenu';
import trackedTopicsMenu, { addTopicLinkQuestion } from './trackedTopicsMenu';

const usernameConfirmMenuMiddleware = new MenuMiddleware(
  '/prompt/username/',
  usernameConfirmMenu,
);

const userIdConfirmMenuMiddleware = new MenuMiddleware(
  '/prompt/userId/',
  userIdConfirmMenu,
);

const configureMentionsMenuMiddleware = new MenuMiddleware(
  '/prompt/mentions/',
  configureMentionsMenu,
);

const configureMeritsMenuMiddleware = new MenuMiddleware(
  '/prompt/merits/',
  configureMeritsMenu,
);

const mainMenuMiddleware = new MenuMiddleware('/main/', mainMenu);

const trackedTopicsMenuMiddleware = new MenuMiddleware(
  '/main/trackedTopics/',
  trackedTopicsMenu,
);

export {
  usernameConfirmMenuMiddleware,
  userIdConfirmMenuMiddleware,
  configureMentionsMenuMiddleware,
  configureMeritsMenuMiddleware,
  mainMenuMiddleware,
  trackedTopicsMenuMiddleware,
  addTopicLinkQuestion,
};
