import type { Bot } from 'grammy';

import { addIgnoredTopicLinkQuestion } from './ignoredTopicsMenu';
import { addIgnoredUserQuestion } from './ignoredUsersMenu';
import { addTrackedPhraseLinkQuestion } from './trackedPhrasesMenu';
import { addTrackedTopicLinkQuestion, addTrackedTopicUserQuestion } from './trackedTopicsMenu';

function setupQuestionMiddlewares(bot: Bot): void {
  bot.use(
    addTrackedTopicLinkQuestion,
    addTrackedTopicUserQuestion,
    addTrackedPhraseLinkQuestion,
    addIgnoredTopicLinkQuestion,
    addIgnoredUserQuestion,
  );
}

export { setupQuestionMiddlewares };
