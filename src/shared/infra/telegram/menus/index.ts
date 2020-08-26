import { MenuMiddleware } from 'telegraf-inline-menu';

import usernameConfirmMenu from './usernameConfirmMenu';
import userIdConfirmMenu from './userIdConfirmMenu';
import configureMentionsMenu from './configureMentionsMenu';
import configureMeritsMenu from './configureMeritsMenu';

import mainMenu from './mainMenu';
import trackedTopicsMenu, {
  addTrackedTopicLinkQuestion,
} from './trackedTopicsMenu';
import ignoredUsersMenu, { addIgnoredUserQuestion } from './ignoredUsersMenu';
import ignoredTopicsMenu, {
  addIgnoredTopicLinkQuestion,
} from './ignoredTopicsMenu';

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

const ignoredUsersMenuMiddleware = new MenuMiddleware(
  '/main/ignoredUsers/',
  ignoredUsersMenu,
);

const ignoredTopicsMenuMiddleware = new MenuMiddleware(
  '/main/ignoredTopics/',
  ignoredTopicsMenu,
);

export {
  usernameConfirmMenuMiddleware,
  userIdConfirmMenuMiddleware,
  configureMentionsMenuMiddleware,
  configureMeritsMenuMiddleware,
  mainMenuMiddleware,
  trackedTopicsMenuMiddleware,
  addTrackedTopicLinkQuestion,
  ignoredUsersMenuMiddleware,
  addIgnoredUserQuestion,
  ignoredTopicsMenuMiddleware,
  addIgnoredTopicLinkQuestion,
};
