import { MenuTemplate, replyMenuToContext } from 'grammy-inline-menu';
import { container } from 'tsyringe';
import { StatelessQuestion } from '@grammyjs/stateless-question';
import { format } from 'date-fns';

import IMenuContext from '../@types/IMenuContext';

import logger from '../../../services/logger';

import FindIgnoredTopicsByTelegramIdService from '../services/FindIgnoredTopicsByTelegramIdService';
import AddIgnoredTopicService from '../../../../modules/posts/services/AddIgnoredTopicService';
import RemoveIgnoredTopicService from '../../../../modules/posts/services/RemoveIgnoredTopicService';
import getPost from '##/modules/posts/services/get-post';

const ignoredTopicsMenu = new MenuTemplate<IMenuContext>(() => ({
  text: `<b>Ignored Topics</b>\n\nAdd or remove ignored topics so you don't get notifications from them.`,
  parse_mode: 'HTML'
}));

const getPostInfo = async (postId: number) => {
  return getPost({ postId, shouldCache: true, shouldScrape: false });
};

const ignoredTopicsMenuInfoMenu = new MenuTemplate<IMenuContext>(async ctx => {
  const post = await getPostInfo(Number(ctx.match[1]));

  const formattedDate = format(new Date(post.date), 'Pp');

  let message = '';
  message += `<b>Ignored Topic:</b>\n\n`;
  message += `🏷️ <b>Title:</b> ${post.title}\n`;
  message += `✍️ <b>Author:</b> ${post.author}\n`;
  message += `🕗 <b>Date:</b> ${formattedDate}\n`;

  return {
    text: message,
    parse_mode: 'HTML'
  };
});

const confirmRemoveIgnoredTopicMenu = new MenuTemplate<IMenuContext>(async ctx => {
  const post = await getPostInfo(Number(ctx.match[1]));

  return {
    text: `Are you sure you want to stop ignoring the topic: <b>${post.title}</b>?`,
    parse_mode: 'HTML'
  };
});

confirmRemoveIgnoredTopicMenu.interact('Yes, do it!', 'yes', {
  do: async ctx => {
    const removeIgnoredTopic = container.resolve(RemoveIgnoredTopicService);
    await removeIgnoredTopic.execute(Number(ctx.match[1]), String(ctx.chat.id));

    return '/ignoredTopics/';
  }
});

confirmRemoveIgnoredTopicMenu.interact('No, go back!', 'no', {
  do: async () => `..`
});

ignoredTopicsMenuInfoMenu.submenu('🚫 Stop Ignoring', 'remove', confirmRemoveIgnoredTopicMenu);

ignoredTopicsMenuInfoMenu.interact('↩ Go Back', 'back', {
  do: () => '..'
});

const addIgnoredTopicLinkQuestion = new StatelessQuestion('addIgnoredTopic', async (ctx: IMenuContext) => {
  const text = ctx.message.text.toLowerCase().trim();

  if (text.match(/bitcointalk.org\/index\.php\?topic=\d+/gi)) {
    const statusMessage = await ctx.reply('Wait a bit while I check the link...');

    const topic_id = text.match(/topic=(\d+)/i);

    if (!topic_id || !topic_id[1]) {
      await ctx.api.deleteMessage(statusMessage.chat.id, statusMessage.message_id);
      await ctx.reply('Hmm... are you sure this link is valid and from a BitcoinTalk topic?', {
        reply_markup: { remove_keyboard: true }
      });

      return;
    }

    const addIgnoredTopic = container.resolve(AddIgnoredTopicService);

    try {
      await ctx.api.editMessageText(
        statusMessage.chat.id,
        statusMessage.message_id,
        'We have added your request to the queue.\n\nThis will take a few seconds...'
      );

      const ignoredTopic = await addIgnoredTopic.execute(Number(topic_id[1]), String(ctx.message.chat.id));

      await ctx.api.deleteMessage(statusMessage.chat.id, statusMessage.message_id);

      let message = '';
      message += 'You are now ignoring the topic: ';
      message += `<b><a href="https://bitcointalk.org/index.php?topic=${ignoredTopic.post.topic_id}">${ignoredTopic.post.title}</a></b>`;

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: { remove_keyboard: true }
      });

      await replyMenuToContext(ignoredTopicsMenu, ctx, '/');
    } catch (error) {
      await ctx.api.deleteMessage(statusMessage.chat.id, statusMessage.message_id).catch();

      if (error.message === 'Topic already being ignored.') {
        await ctx.reply('You are already ignoring this topic.', {
          reply_markup: { remove_keyboard: true }
        });

        return;
      }

      logger.error({ telegram_id: ctx.chat.id, error }, 'Error while adding Ignored Topic.');

      await ctx.reply('Something went wrong...', {
        reply_markup: { remove_keyboard: true }
      });
    }
  } else {
    const message = `Invalid URL. What is the URL of the topic you want to track?`;
    await addIgnoredTopicLinkQuestion.replyWithHTML(ctx, message);
  }
});

const getIgnoredTopics = async (ctx: IMenuContext) => {
  const findIgnoredTopicsByTelegramId = container.resolve(FindIgnoredTopicsByTelegramIdService);
  const ignoredTopics = await findIgnoredTopicsByTelegramId.execute(String(ctx.chat.id));

  const formatted = {};

  ignoredTopics.forEach(choice => {
    let formattedTitle = '';
    formattedTitle += choice.post.title.substring(0, 35);
    formattedTitle += choice.post.title.length >= 35 ? '...' : '';

    formatted[choice.post.post_id] = formattedTitle;
  });

  return formatted;
};

ignoredTopicsMenu.chooseIntoSubmenu('ignoredTopics', getIgnoredTopics, ignoredTopicsMenuInfoMenu, {
  maxRows: 10,
  columns: 1,
  getCurrentPage: ctx => ctx.session.page,
  setPage: (ctx, page) => {
    ctx.session.page = page;
  },
  disableChoiceExistsCheck: true
});

ignoredTopicsMenu.interact('✨ Add new', 'add', {
  do: async ctx => {
    const message = 'What is the URL of the topic you want to ignore?';

    await addIgnoredTopicLinkQuestion.replyWithHTML(ctx, message);
    return true;
  }
});

ignoredTopicsMenu.interact('↩ Go Back', 'back', {
  do: () => '..',
  joinLastRow: true
});

export { addIgnoredTopicLinkQuestion };
export default ignoredTopicsMenu;
