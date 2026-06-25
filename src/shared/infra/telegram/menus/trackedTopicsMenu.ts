import { Menu } from '@grammyjs/menu';
import { StatelessQuestion } from '@grammyjs/stateless-question';
import { format } from 'date-fns';
import { container } from 'tsyringe';

import type IMenuContext from '../@types/IMenuContext';

import AddTrackedTopicService from '../../../../modules/posts/services/AddTrackedTopicService';
import RemoveTrackedTopicService from '../../../../modules/posts/services/RemoveTrackedTopicService';
import logger from '../../../services/logger';
import CreateTrackedTopicUserService from '../services/CreateTrackedTopicUserService';
import DeleteTrackedTopicUserService from '../services/DeleteTrackedTopicUserService';
import FindPostByTrackedTopicService from '../services/FindPostByTrackedTopicService';
import FindTrackedTopicsByTelegramIdService from '../services/FindTrackedTopicsByTelegramIdService';
import FindTrackedTopicUsersService from '../services/FindTrackedTopicUsersService';
import { editHtml, editHtmlMenu, replyHtmlMenu } from './menu-utils';

export const TRACKED_TOPICS_MENU_HTML =
  '<b>Tracked Topics</b>\n\nAdd or remove topics so you get notified of new replies.\n\n<code>* Topic with whitelisted users</code>';

async function getTopicInfo(topicId: number) {
  const findPostByTrackedTopic = container.resolve(FindPostByTrackedTopicService);
  return findPostByTrackedTopic.execute({ topic_id: topicId });
}

async function trackedTopicInfoHtml(ctx: IMenuContext) {
  const post = await getTopicInfo(ctx.session.selectedTrackedTopicId);
  const findTrackedTopicUsers = container.resolve(FindTrackedTopicUsersService);
  const users = await findTrackedTopicUsers.execute({
    telegram_id: String(ctx.chat.id),
    topic_id: ctx.session.selectedTrackedTopicId,
  });
  const usersMessage = users.reduce(
    (p, c, i) => (i === 0 ? `<pre>${c.username}</pre>` : `${p}, <pre>${c.username}</pre>`),
    '',
  );
  const formattedDate = format(new Date(post.date), 'Pp');

  return [
    '<b>Selected Topic:</b>',
    '',
    `🏷️ <b>Title:</b> ${post.title}`,
    `✍️ <b>Author:</b> ${post.author}`,
    `🕗 <b>Date:</b> ${formattedDate}`,
    '',
    `👤 <b>Whitelisted:</b> ${users.length ? usersMessage : 'Everyone'}`,
  ].join('\n');
}

async function trackedTopicAuthorsHtml(ctx: IMenuContext) {
  const post = await getTopicInfo(ctx.session.selectedTrackedTopicId);
  const formattedDate = format(new Date(post.date), 'Pp');
  return [
    '<b>Selected Topic:</b>',
    '',
    `🏷️ <b>Title:</b> ${post.title}`,
    `✍️ <b>Author:</b> ${post.author}`,
    `🕗 <b>Date:</b> ${formattedDate}`,
    '',
    'If you add a user to your tracked topic, you will only get notified about his posts.',
  ].join('\n');
}

async function trackedTopicUserInfoHtml(ctx: IMenuContext) {
  const post = await getTopicInfo(ctx.session.selectedTrackedTopicId);
  return `🏷️ <b>Topic:</b> ${post.title}\n\n👤 <b>User:</b> ${ctx.session.selectedTrackedTopicUser}`;
}

const confirmRemoveTrackedTopicUser = new Menu<IMenuContext>('ttur')
  .text('Yes, do it!', async (ctx) => {
    const findTrackedTopicUsers = container.resolve(FindTrackedTopicUsersService);
    const deleteTrackedTopicUser = container.resolve(DeleteTrackedTopicUserService);
    const trackedTopicUser = await findTrackedTopicUsers.execute({
      telegram_id: String(ctx.chat.id),
      topic_id: ctx.session.selectedTrackedTopicId,
      username: ctx.session.selectedTrackedTopicUser,
    });
    await deleteTrackedTopicUser.execute(trackedTopicUser[0]);
    ctx.session.selectedTrackedTopicUser = null;
    await editHtmlMenu(ctx, await trackedTopicAuthorsHtml(ctx), trackedTopicAuthorsMenu);
  })
  .row()
  .back('No, go back!', async (ctx) => {
    await editHtml(ctx, await trackedTopicUserInfoHtml(ctx));
  });

const trackedTopicUsersInfoMenu = new Menu<IMenuContext>('ttui')
  .submenu('🗑️ Remove User', 'ttur', async (ctx) => {
    await editHtml(
      ctx,
      `Are you sure you want to remove the user: <b>${ctx.session.selectedTrackedTopicUser}</b>?`,
    );
  })
  .row()
  .back('↩ Go Back', async (ctx) => {
    ctx.session.selectedTrackedTopicUser = null;
    await editHtml(ctx, await trackedTopicAuthorsHtml(ctx));
  });

const trackedTopicAuthorsMenu = new Menu<IMenuContext>('tta')
  .dynamic(async (ctx, range) => {
    const findTrackedTopicUsers = container.resolve(FindTrackedTopicUsersService);
    const users = await findTrackedTopicUsers.execute({
      telegram_id: String(ctx.chat.id),
      topic_id: ctx.session.selectedTrackedTopicId,
    });
    const page = ctx.session.page ?? 0;
    const totalPages = Math.max(1, Math.ceil(users.length / 5));

    for (const user of users.slice(page * 5, (page + 1) * 5)) {
      range
        .submenu({ text: user.username, payload: user.username }, 'ttui', async (menuCtx) => {
          menuCtx.session.selectedTrackedTopicUser = menuCtx.match;
          await editHtml(menuCtx, await trackedTopicUserInfoHtml(menuCtx));
        })
        .row();
    }

    if (totalPages > 1) {
      if (page > 0)
        range.text('◀️ Prev', (menuCtx) => {
          menuCtx.session.page = page - 1;
          menuCtx.menu.update();
        });
      range.text(`${page + 1}/${totalPages}`, (menuCtx) =>
        menuCtx.answerCallbackQuery(`Page ${page + 1} of ${totalPages}`),
      );
      if (page < totalPages - 1)
        range.text('Next ▶️', (menuCtx) => {
          menuCtx.session.page = page + 1;
          menuCtx.menu.update();
        });
      range.row();
    }
  })
  .text('✨ Add new', async (ctx) => {
    ctx.session.addTrackedTopicUserTopicId = ctx.session.selectedTrackedTopicId;
    await addTrackedTopicUserQuestion.replyWithHTML(
      ctx,
      'What is the username of the user you want to add?',
    );
  })
  .back('↩ Go Back', async (ctx) => {
    await editHtml(ctx, await trackedTopicInfoHtml(ctx));
  });

const confirmRemoveTrackedTopicMenu = new Menu<IMenuContext>('ttr')
  .text('Yes, do it!', async (ctx) => {
    const removeTrackedTopic = container.resolve(RemoveTrackedTopicService);
    await removeTrackedTopic.execute(ctx.session.selectedTrackedTopicId, String(ctx.chat.id));
    ctx.session.selectedTrackedTopicId = null;
    await editHtmlMenu(ctx, TRACKED_TOPICS_MENU_HTML, trackedTopicsMenu);
  })
  .row()
  .back('No, go back!', async (ctx) => {
    await editHtml(ctx, await trackedTopicInfoHtml(ctx));
  });

const trackedTopicInfoMenu = new Menu<IMenuContext>('tti')
  .dynamic(async (ctx, range) => {
    const post = await getTopicInfo(ctx.session.selectedTrackedTopicId);
    range
      .url(
        '🔗 Visit Topic',
        `https://bitcointalk.org/index.php?topic=${post.topic_id}.msg${post.post_id}#msg${post.post_id}`,
      )
      .row();
  })
  .submenu('👤 Whitelist Authors', 'tta', async (ctx) => {
    ctx.session.page = 0;
    await editHtml(ctx, await trackedTopicAuthorsHtml(ctx));
  })
  .row()
  .submenu('🗑️ Remove Topic', 'ttr', async (ctx) => {
    const post = await getTopicInfo(ctx.session.selectedTrackedTopicId);
    await editHtml(ctx, `Are you sure you want to remove the tracked topic: <b>${post.title}</b>?`);
  })
  .row()
  .back('↩ Go Back', async (ctx) => {
    ctx.session.selectedTrackedTopicId = null;
    await editHtml(ctx, TRACKED_TOPICS_MENU_HTML);
  });

const trackedTopicsMenu = new Menu<IMenuContext>('ttm')
  .dynamic(async (ctx, range) => {
    const findTrackedTopicsByTelegramId = container.resolve(FindTrackedTopicsByTelegramIdService);
    const findTrackedTopicUsers = container.resolve(FindTrackedTopicUsersService);
    const trackedTopics = await findTrackedTopicsByTelegramId.execute(String(ctx.chat.id));
    const trackedTopicUsers = await findTrackedTopicUsers.execute({
      telegram_id: String(ctx.chat.id),
    });
    const userTopicsWithWhitelist = trackedTopicUsers.map(
      (trackedUser) => trackedUser.tracked_topic_id,
    );
    const page = ctx.session.page ?? 0;
    const totalPages = Math.max(1, Math.ceil(trackedTopics.length / 10));

    for (const choice of trackedTopics.slice(page * 10, (page + 1) * 10)) {
      let title = userTopicsWithWhitelist.includes(choice.topic_id) ? '* ' : '';
      title += choice.post.title.substring(0, 35);
      title += choice.post.title.length >= 35 ? '...' : '';
      range
        .submenu({ text: title, payload: String(choice.post.topic_id) }, 'tti', async (menuCtx) => {
          menuCtx.session.selectedTrackedTopicId = Number(menuCtx.match);
          await editHtml(menuCtx, await trackedTopicInfoHtml(menuCtx));
        })
        .row();
    }

    if (totalPages > 1) {
      if (page > 0)
        range.text('◀️ Prev', (menuCtx) => {
          menuCtx.session.page = page - 1;
          menuCtx.menu.update();
        });
      range.text(`${page + 1}/${totalPages}`, (menuCtx) =>
        menuCtx.answerCallbackQuery(`Page ${page + 1} of ${totalPages}`),
      );
      if (page < totalPages - 1)
        range.text('Next ▶️', (menuCtx) => {
          menuCtx.session.page = page + 1;
          menuCtx.menu.update();
        });
      range.row();
    }
  })
  .text('✨ Add new', async (ctx) => {
    await addTrackedTopicLinkQuestion.replyWithHTML(
      ctx,
      'What is the URL of the topic you want to track?',
    );
  })
  .back('↩ Go Back', async (ctx) => {
    await editHtml(ctx, '<b>Notify me about...</b>\n\nChoose what should trigger notifications.');
  });

trackedTopicsMenu.register(trackedTopicInfoMenu);
trackedTopicInfoMenu.register([trackedTopicAuthorsMenu, confirmRemoveTrackedTopicMenu]);
trackedTopicAuthorsMenu.register(trackedTopicUsersInfoMenu);
trackedTopicUsersInfoMenu.register(confirmRemoveTrackedTopicUser);

const addTrackedTopicUserQuestion = new StatelessQuestion('addUser', async (ctx: IMenuContext) => {
  const text = ctx.msg!.text!.toLowerCase().trim();

  if (!text) {
    await addTrackedTopicUserQuestion.replyWithHTML(
      ctx,
      'Invalid Username. What is the username of the user you want to add?',
    );
    return;
  }

  const createTrackedTopicUser = container.resolve(CreateTrackedTopicUserService);

  try {
    await createTrackedTopicUser.execute({
      username: text,
      telegram_id: String(ctx.msg!.chat.id),
      topic_id: ctx.session.addTrackedTopicUserTopicId,
    });
    ctx.session.selectedTrackedTopicId = ctx.session.addTrackedTopicUserTopicId;
    await replyHtmlMenu(ctx, await trackedTopicAuthorsHtml(ctx), trackedTopicAuthorsMenu);
  } catch (error) {
    if (error.message === 'User already exists in the specified tracked topic') {
      await ctx.reply('You already added this user.', { reply_markup: { remove_keyboard: true } });
      return;
    }

    logger.error({ telegram_id: ctx.chat.id, error }, 'Error while adding Tracked Topic User.');
    await ctx.reply('Something went wrong...', { reply_markup: { remove_keyboard: true } });
  }
});

const addTrackedTopicLinkQuestion = new StatelessQuestion('addTopic', async (ctx: IMenuContext) => {
  const text = ctx.msg!.text!.trim();

  if (!text.match(/bitcointalk.org\/index\.php\?topic=\d+/gi)) {
    await addTrackedTopicLinkQuestion.replyWithHTML(
      ctx,
      'Invalid URL. What is the URL of the topic you want to track?',
    );
    return;
  }

  const statusMessage = await ctx.reply('Wait a bit while I check the link...');
  const topicId = text.match(/topic=(\d+)/i);

  if (!topicId?.[1]) {
    await ctx.api.deleteMessage(statusMessage.chat.id, statusMessage.message_id);
    await ctx.reply('Hmm... are you sure this link is valid and from a BitcoinTalk topic?', {
      reply_markup: { remove_keyboard: true },
    });
    return;
  }

  const addTrackedTopic = container.resolve(AddTrackedTopicService);

  try {
    await ctx.api.editMessageText(
      statusMessage.chat.id,
      statusMessage.message_id,
      'We have added your request to the queue.\n\nThis will take a few seconds...',
    );
    await addTrackedTopic.execute(Number(topicId[1]), String(ctx.msg!.chat.id));
    await ctx.api.deleteMessage(statusMessage.chat.id, statusMessage.message_id);
    await replyHtmlMenu(ctx, TRACKED_TOPICS_MENU_HTML, trackedTopicsMenu);
  } catch (error) {
    await ctx.api.deleteMessage(statusMessage.chat.id, statusMessage.message_id).catch(() => {});

    if (error.message === 'Topic already being tracked.') {
      await ctx.reply('You are already tracking this topic.', {
        reply_markup: { remove_keyboard: true },
      });
      return;
    }

    logger.error({ telegram_id: ctx.chat.id, error }, 'Error while adding Tracked Topic.');
    await ctx.reply('Something went wrong...', { reply_markup: { remove_keyboard: true } });
  }
});

export { addTrackedTopicLinkQuestion, addTrackedTopicUserQuestion };
export default trackedTopicsMenu;
