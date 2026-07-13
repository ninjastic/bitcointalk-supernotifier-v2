import type { Bot } from 'grammy';

import type IMenuContext from '../@types/IMenuContext';

import { addIgnoredTopicLinkQuestion } from './ignoredTopicsMenu';
import { addIgnoredUserQuestion } from './ignoredUsersMenu';
import { addTrackedPhraseLinkQuestion } from './trackedPhrasesMenu';
import {
  addTrackedTopicLinkQuestion,
  addTrackedTopicUserQuestion,
  searchTrackedTopicsQuestion,
} from './trackedTopicsMenu';

function setupQuestionMiddlewares(bot: Bot<IMenuContext>): void {
  bot.use(
    addTrackedTopicLinkQuestion,
    addTrackedTopicUserQuestion,
    searchTrackedTopicsQuestion,
    addTrackedPhraseLinkQuestion,
    addIgnoredTopicLinkQuestion,
    addIgnoredUserQuestion,
  );
}

export { setupQuestionMiddlewares };
