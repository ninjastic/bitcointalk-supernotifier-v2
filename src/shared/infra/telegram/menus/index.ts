import type { Bot } from 'grammy';

import { addTrackedTopicLinkQuestion, addTrackedTopicUserQuestion } from './trackedTopicsMenu';
import { addTrackedPhraseLinkQuestion } from './trackedPhrasesMenu';
import { addIgnoredUserQuestion } from './ignoredUsersMenu';
import { addIgnoredTopicLinkQuestion } from './ignoredTopicsMenu';

const setupQuestionMiddlewares = (bot: Bot): void => {
  bot.use(
    addTrackedTopicLinkQuestion,
    addTrackedTopicUserQuestion,
    addTrackedPhraseLinkQuestion,
    addIgnoredTopicLinkQuestion,
    addIgnoredUserQuestion
  );
};

export { setupQuestionMiddlewares };
