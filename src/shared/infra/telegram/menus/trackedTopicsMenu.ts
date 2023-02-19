import { container } from 'tsyringe';
import { MenuTemplate, replyMenuToContext } from 'grammy-inline-menu';
import { StatelessQuestion } from '@grammyjs/stateless-question';
import { format } from 'date-fns';

import logger from '../../../services/logger';

import IMenuContext from '../@types/IMenuContext';

import AddTrackedTopicService from '../../../../modules/posts/services/AddTrackedTopicService';
import RemoveTrackedTopicService from '../../../../modules/posts/services/RemoveTrackedTopicService';
import FindTrackedTopicsByTelegramIdService from '../services/FindTrackedTopicsByTelegramIdService';
import FindTrackedTopicUsersService from '../services/FindTrackedTopicUsersService';
import CreateTrackedTopicUserService from '../services/CreateTrackedTopicUserService';
import DeleteTrackedTopicUserService from '../services/DeleteTrackedTopicUserService';
import FindPostByTrackedTopicService from '../services/FindPostByTrackedTopicService';

const trackedTopicsMenu = new MenuTemplate<IMenuContext>(() => ({
  text: '<b>Tracked Topics</b>\n\nAdd or remove topics so you get notified of new replies.\n\n<code>* Topic with whitelisted users</code>',
  parse_mode: 'HTML'
}));

const getTopicInfo = async (topic_id: number) => {
  const findPostByTrackedTopic = container.resolve(FindPostByTrackedTopicService);

  const post = await findPostByTrackedTopic.execute({ topic_id });

  return post;
};

const trackedTopicInfoMenu = new MenuTemplate<IMenuContext>(async ctx => {
  const postId = Number(ctx.match[1]);
  const post = await getTopicInfo(postId);

  const findTrackedTopicUsers = container.resolve(FindTrackedTopicUsersService);

  const users = await findTrackedTopicUsers.execute({
    telegram_id: ctx.chat.id,
    topic_id: Number(ctx.match[1])
  });

  const usersMessage = users.reduce((p, c, i) => {
    if (i === 0) return `<pre>${c.username}</pre>`;
    return `${p}, <pre>${c.username}</pre>`;
  }, '');

  const formattedDate = format(new Date(post.date), 'Pp');

  let message = '';
  message += '<b>Selected Topic:</b>\n\n';
  message += `🏷️ <b>Title:</b> ${post.title}\n`;
  message += `✍️ <b>Author:</b> ${post.author}\n`;
  message += `🕗 <b>Date:</b> ${formattedDate}\n\n`;
  message += '👤 <b>Whitelisted:</b> ';
  message += !users.length ? 'Everyone' : usersMessage;

  return {
    text: message,
    parse_mode: 'HTML'
  };
});

const getTrackedTopicUrl = async (ctx: IMenuContext): Promise<string> => {
  const topicId = Number(ctx.match[1]);

  const findPostByTrackedTopic = container.resolve(FindPostByTrackedTopicService);

  const post = await findPostByTrackedTopic.execute({ topic_id: topicId });

  return `https://bitcointalk.org/index.php?topic=${post.topic_id}.msg${post.post_id}#msg${post.post_id}`;
};

trackedTopicInfoMenu.url('🔗 Visit Topic', getTrackedTopicUrl);

const trackedTopicAuthorsMenu = new MenuTemplate<IMenuContext>(async ctx => {
  const post = await getTopicInfo(Number(ctx.match[1]));

  const formattedDate = format(new Date(post.date), 'Pp');

  let message = '';
  message += '<b>Selected Topic:</b>\n\n';
  message += `🏷️ <b>Title:</b> ${post.title}\n`;
  message += `✍️ <b>Author:</b> ${post.author}\n`;
  message += `🕗 <b>Date:</b> ${formattedDate}\n\n`;
  message += 'If you add a user to your tracked topic, you will only get notified about his posts.';

  return {
    text: message,
    parse_mode: 'HTML'
  };
});

trackedTopicInfoMenu.submenu('👤 Whitelist Authors', 'a', trackedTopicAuthorsMenu);

const getTrackedTopicUsersList = async (ctx: IMenuContext) => {
  const findTrackedTopicUsers = container.resolve(FindTrackedTopicUsersService);

  const choices = await findTrackedTopicUsers.execute({
    telegram_id: ctx.chat.id,
    topic_id: Number(ctx.match[1])
  });

  const formatted = {};

  choices.forEach(choice => {
    let formattedTitle = '';
    formattedTitle += choice.username;

    formatted[choice.username] = formattedTitle;
  });

  return formatted;
};

const trackedTopicUsersInfoMenu = new MenuTemplate<IMenuContext>(async ctx => {
  const post = await getTopicInfo(Number(ctx.match[1]));

  let message = '';
  message += '🏷️ <b>Topic:</b> ';
  message += `${post.title}\n\n`;
  message += '👤 <b>User:</b> ';
  message += `${ctx.match[2]}`;

  return {
    text: message,
    parse_mode: 'HTML'
  };
});

const confirmRemoveTrackedTopicUser = new MenuTemplate<IMenuContext>(async ctx => ({
  text: `Are you sure you want to remove the user: <b>${ctx.match[2]}</b>?`,
  parse_mode: 'HTML'
}));

confirmRemoveTrackedTopicUser.interact('Yes, do it!', 'yes', {
  do: async ctx => {
    const findTrackedTopicUsers = container.resolve(FindTrackedTopicUsersService);

    const deleteTrackedTopicUser = container.resolve(DeleteTrackedTopicUserService);

    const trackedTopicUser = await findTrackedTopicUsers.execute({
      telegram_id: ctx.chat.id,
      topic_id: Number(ctx.match[1]),
      username: ctx.match[2]
    });

    await deleteTrackedTopicUser.execute(trackedTopicUser[0]);

    return `/tt/tt:${ctx.match[1]}/a/`;
  }
});

confirmRemoveTrackedTopicUser.interact('No, go back!', 'no', {
  do: async () => `..`
});

trackedTopicUsersInfoMenu.submenu('❌ Remove User', 'remove', confirmRemoveTrackedTopicUser);

trackedTopicUsersInfoMenu.interact('↩ Go Back', 'back', {
  do: () => '..',
  joinLastRow: true
});

const addTrackedTopicUserQuestion = new StatelessQuestion('addUser', async (ctx: IMenuContext) => {
  const text = ctx.message.text.toLowerCase().trim();

  if (text) {
    const createTrackedTopicUser = container.resolve(CreateTrackedTopicUserService);

    try {
      await createTrackedTopicUser.execute({
        username: text,
        telegram_id: ctx.message.chat.id,
        topic_id: ctx.session.addTrackedTopicUserTopicId
      });

      let message = '';
      message += 'Whitelisted user added to tracked topic: ';
      message += `<b>${text}</b>`;

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: { remove_keyboard: true }
      });

      await replyMenuToContext(trackedTopicsMenu, ctx, '/');
    } catch (error) {
      if (error.message === 'User already exists in the specified tracked topic') {
        await ctx.reply('You already added this user.', {
          reply_markup: { remove_keyboard: true }
        });

        return;
      }

      logger.error({ telegram_id: ctx.chat.id, error }, 'Error while adding Tracked Topic User.');

      await ctx.reply('Something went wrong...', {
        reply_markup: { remove_keyboard: true }
      });
    }
  } else {
    const message = 'Invalid Username. What is the username of the user you want to add?';
    await addTrackedTopicUserQuestion.replyWithHTML(ctx, message);
  }
});

trackedTopicAuthorsMenu.chooseIntoSubmenu('authors', getTrackedTopicUsersList, trackedTopicUsersInfoMenu, {
  maxRows: 4,
  columns: 1,
  getCurrentPage: ctx => ctx.session.page,
  setPage: (ctx, page) => {
    ctx.session.page = page;
  },
  disableChoiceExistsCheck: true
});

trackedTopicAuthorsMenu.interact('✨ Add new', 'add', {
  do: async ctx => {
    const message = 'What is the username of the user you want to add?';
    const topicId = ctx.match[1];

    ctx.session.addTrackedTopicUserTopicId = Number(topicId);

    await addTrackedTopicUserQuestion.replyWithHTML(ctx, message);
    return true;
  }
});

trackedTopicAuthorsMenu.interact('↩ Go Back', 'back', {
  do: () => '..',
  joinLastRow: true
});

const confirmRemoveTrackedTopicMenu = new MenuTemplate<IMenuContext>(async ctx => {
  const post = await getTopicInfo(Number(ctx.match[1]));
  return {
    text: `Are you sure you want to remove the tracked topic: <b>${post.title}</b>?`,
    parse_mode: 'HTML'
  };
});

confirmRemoveTrackedTopicMenu.interact('Yes, do it!', 'yes', {
  do: async ctx => {
    const removeTrackedTopic = container.resolve(RemoveTrackedTopicService);

    await removeTrackedTopic.execute(Number(ctx.match[1]), ctx.chat.id);

    return '/tt/';
  }
});

confirmRemoveTrackedTopicMenu.interact('No, go back!', 'no', {
  do: async () => `..`
});

trackedTopicInfoMenu.submenu('❌ Remove Topic', 'remove', confirmRemoveTrackedTopicMenu);

trackedTopicInfoMenu.interact('↩ Go Back', 'back', {
  do: () => '..'
});

const addTrackedTopicLinkQuestion = new StatelessQuestion('addTopic', async (ctx: IMenuContext) => {
  const text = ctx.message.text.trim();

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

    const addTrackedTopic = container.resolve(AddTrackedTopicService);

    try {
      await ctx.api.editMessageText(
        statusMessage.chat.id,
        statusMessage.message_id,
        'We have added your request to the queue.\n\nThis will take a few seconds...'
      );

      const trackedTopic = await addTrackedTopic.execute(Number(topic_id[1]), ctx.message.chat.id);

      await ctx.api.deleteMessage(statusMessage.chat.id, statusMessage.message_id);

      let message = '';
      message += 'You are now tracking the topic: ';
      message += `<b><a href="https://bitcointalk.org/index.php?topic=${trackedTopic.post.topic_id}">${trackedTopic.post.title}</a></b>`;

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: { remove_keyboard: true }
      });

      await replyMenuToContext(trackedTopicsMenu, ctx, '/');
    } catch (error) {
      await ctx.api.deleteMessage(statusMessage.chat.id, statusMessage.message_id).catch();

      if (error.message === 'Topic already being tracked.') {
        await ctx.reply('You are already tracking this topic.', {
          reply_markup: { remove_keyboard: true }
        });

        return;
      }

      logger.error({ telegram_id: ctx.chat.id, error }, 'Error while adding Tracked Topic.');

      await ctx.reply('Something went wrong...', {
        reply_markup: { remove_keyboard: true }
      });
    }
  } else {
    const message = 'Invalid URL. What is the URL of the topic you want to track?';
    await addTrackedTopicLinkQuestion.replyWithHTML(ctx, message);
  }
});

const getTrackedTopicsList = async (ctx: IMenuContext) => {
  const findTrackedTopicsByTelegramId = container.resolve(FindTrackedTopicsByTelegramIdService);

  const choices = await findTrackedTopicsByTelegramId.execute(ctx.chat.id);

  const findTrackedTopicUsers = container.resolve(FindTrackedTopicUsersService);

  const trackedTopicUsers = await findTrackedTopicUsers.execute({
    telegram_id: ctx.chat.id
  });

  const userTopicsWithWhitelist = [];

  trackedTopicUsers.forEach(trackedUser => {
    if (!userTopicsWithWhitelist.includes(trackedUser.tracked_topic_id)) {
      userTopicsWithWhitelist.push(trackedUser.tracked_topic_id);
    }
  });

  const formatted = {};

  choices.forEach(choice => {
    let formattedTitle = userTopicsWithWhitelist.includes(choice.topic_id) ? '* ' : '';
    formattedTitle += choice.post.title.substr(0, 35);
    formattedTitle += choice.post.title.length >= 35 ? '...' : '';

    formatted[choice.post.topic_id] = formattedTitle;
  });

  return formatted;
};

trackedTopicsMenu.chooseIntoSubmenu('tt', getTrackedTopicsList, trackedTopicInfoMenu, {
  maxRows: 4,
  columns: 1,
  getCurrentPage: ctx => ctx.session.page,
  setPage: (ctx, page) => {
    ctx.session.page = page;
  },
  disableChoiceExistsCheck: true
});

trackedTopicsMenu.interact('✨ Add new', 'add', {
  do: async ctx => {
    const message = 'What is the URL of the topic you want to track?';

    await addTrackedTopicLinkQuestion.replyWithHTML(ctx, message);
    return true;
  }
});

trackedTopicsMenu.interact('↩ Go Back', 'back', {
  do: () => '..',
  joinLastRow: true
});

export { addTrackedTopicLinkQuestion, addTrackedTopicUserQuestion };
export default trackedTopicsMenu;
