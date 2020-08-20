import { Context } from 'telegraf';
import { MenuTemplate } from 'telegraf-inline-menu';
import { container } from 'tsyringe';
import TelegrafStatelessQuestion from 'telegraf-stateless-question';
import { format } from 'date-fns';

import ISession from '../@types/ISession';
import bot from '../index';

import AddTrackedTopicService from '../../../../modules/posts/services/AddTrackedTopicService';
import RemoveTrackedTopicService from '../../../../modules/posts/services/RemoveTrackedTopicService';
import FindTrackedTopicsByTelegramIdService from '../services/FindTrackedTopicsByTelegramIdService';
import GetPostService from '../../../../modules/posts/services/GetPostService';

import { trackedTopicsMenuMiddleware } from './index';

interface MenuContext extends Context {
  session: ISession;
}

const trackedTopicsMenu = new MenuTemplate<MenuContext>(() => {
  return {
    text: `<b>Tracked Topics</b>\n\nAdd or remove topics so you get notified of new replies.`,
    parse_mode: 'HTML',
  };
});

const getPostInfo = async (post_id: number) => {
  const getPost = container.resolve(GetPostService);
  const post = await getPost.execute(post_id);

  return post;
};

const trackedTopicInfoMenu = new MenuTemplate<MenuContext>(async ctx => {
  const post = await getPostInfo(Number(ctx.match[1]));

  const formattedDate = format(new Date(post.date), 'Pp');

  let message = '';
  message += `<b>Selected Topic:</b>\n\n`;
  message += `🏷️ <b>Title:</b> ${post.title}\n`;
  message += `✍️ <b>Author:</b> ${post.author}\n`;
  message += `🕗 <b>Date:</b> ${formattedDate}\n`;

  return {
    text: message,
    parse_mode: 'HTML',
  };
});

const getTrackedTopicUrl = async (ctx: MenuContext): Promise<string> => {
  const post_id = Number(ctx.match[1]);

  const getPost = container.resolve(GetPostService);
  const post = await getPost.execute(post_id);

  return `https://bitcointalk.org/index.php?topic=${post.topic_id}.msg${post.post_id}#msg${post.post_id}`;
};

trackedTopicInfoMenu.url('🔗 Visit Topic', getTrackedTopicUrl);

const confirmRemoveTrackedTopicMenu = new MenuTemplate<MenuContext>(
  async ctx => {
    const post = await getPostInfo(Number(ctx.match[1]));
    return {
      text: `Are you sure you want to remove the tracked topic: <b>${post.title}</b>?`,
      parse_mode: 'HTML',
    };
  },
);

confirmRemoveTrackedTopicMenu.interact('Yes, do it!', 'yes', {
  do: async ctx => {
    const removeTrackedTopic = container.resolve(RemoveTrackedTopicService);

    await removeTrackedTopic.execute(Number(ctx.match[1]), ctx.chat.id);

    return '/main/trackedTopics/';
  },
});

confirmRemoveTrackedTopicMenu.interact('No, go back!', 'no', {
  do: async () => {
    return `..`;
  },
});

trackedTopicInfoMenu.submenu(
  '❌ Remove Topic',
  'remove',
  confirmRemoveTrackedTopicMenu,
);

trackedTopicInfoMenu.interact('↩ Go Back', 'back', {
  do: () => {
    return '..';
  },
});

const addTrackedTopicLinkQuestion = new TelegrafStatelessQuestion(
  'addTopic',
  async (ctx: MenuContext) => {
    const text = ctx.message.text.trim();

    if (text.match(/bitcointalk.org\/index\.php\?topic=\d+/gi)) {
      const statusMessage = await ctx.reply(
        'Wait a bit while I check the link...',
      );

      const topic_id = text.match(/topic=(\d+)/i);

      if (!topic_id || !topic_id[1]) {
        await bot.instance.telegram.deleteMessage(
          statusMessage.chat.id,
          statusMessage.message_id,
        );
        await ctx.reply(
          'Hmm... are you sure this link is valid and from a BitcoinTalk topic?',
        );

        return;
      }

      const addTrackedTopic = container.resolve(AddTrackedTopicService);

      try {
        await bot.instance.telegram.editMessageText(
          statusMessage.chat.id,
          statusMessage.message_id,
          undefined,
          'We have added your request to the queue.\n\nThis will take a few seconds...',
        );

        const trackedTopic = await addTrackedTopic.execute(
          Number(topic_id[1]),
          ctx.message.chat.id,
        );

        let message = '';
        message += 'You are now tracking the topic: ';
        message += `<b><a href="https://bitcointalk.org/index.php?topic=${trackedTopic.post.topic_id}">${trackedTopic.post.title}</a></b>`;

        await bot.instance.telegram.editMessageText(
          statusMessage.chat.id,
          statusMessage.message_id,
          undefined,
          message,
          { parse_mode: 'HTML' },
        );

        await trackedTopicsMenuMiddleware.replyToContext(ctx);
      } catch (error) {
        await bot.instance.telegram.deleteMessage(
          statusMessage.chat.id,
          statusMessage.message_id,
        );

        if (error.message === 'Topic already being tracked.') {
          await ctx.reply('You are already tracking this topic.');

          return;
        }

        await ctx.reply('Something went wrong...');
      }
    } else {
      const message = `Invalid URL. What is the URL of the topic you want to track?`;
      await addTrackedTopicLinkQuestion.replyWithHTML(ctx, message);
    }
  },
);

const getTrackedTopicsList = async (ctx: MenuContext) => {
  const findTrackedTopicsByTelegramId = container.resolve(
    FindTrackedTopicsByTelegramIdService,
  );

  const choices = await findTrackedTopicsByTelegramId.execute(ctx.chat.id);

  const formatted = {};

  choices.forEach(choice => {
    let formattedTitle = '';
    formattedTitle += choice.post.title.substr(0, 35);
    formattedTitle += choice.post.title.length >= 35 ? '...' : '';

    formatted[choice.post.post_id] = formattedTitle;
  });

  return formatted;
};

trackedTopicsMenu.chooseIntoSubmenu(
  'trackedTopics',
  getTrackedTopicsList,
  trackedTopicInfoMenu,
  {
    maxRows: 4,
    columns: 1,
    getCurrentPage: ctx => ctx.session.page,
    setPage: (ctx, page) => {
      ctx.session.page = page;
    },
    disableChoiceExistsCheck: true,
  },
);

trackedTopicsMenu.interact('✨ Add new', 'add', {
  do: async ctx => {
    const message = 'What is the URL of the topic you want to track?';

    await addTrackedTopicLinkQuestion.replyWithHTML(ctx, message);
    return true;
  },
});

trackedTopicsMenu.interact('↩ Go Back', 'back', {
  do: () => {
    return '..';
  },
  joinLastRow: true,
});

export { addTrackedTopicLinkQuestion };
export default trackedTopicsMenu;
