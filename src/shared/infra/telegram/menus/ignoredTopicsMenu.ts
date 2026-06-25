import { Menu } from '@grammyjs/menu';
import { StatelessQuestion } from '@grammyjs/stateless-question';
import getPost from '##/modules/posts/services/get-post';
import { format } from 'date-fns';
import { container } from 'tsyringe';

import type IMenuContext from '../@types/IMenuContext';

import AddIgnoredTopicService from '../../../../modules/posts/services/AddIgnoredTopicService';
import RemoveIgnoredTopicService from '../../../../modules/posts/services/RemoveIgnoredTopicService';
import logger from '../../../services/logger';
import FindIgnoredTopicsByTelegramIdService from '../services/FindIgnoredTopicsByTelegramIdService';
import { editHtml, editHtmlMenu, replyHtmlMenu } from './menu-utils';

export const IGNORED_TOPICS_MENU_HTML =
  "<b>Ignored Topics</b>\n\nAdd or remove ignored topics so you don't get notifications from them.";

async function getPostInfo(postId: number) {
  return getPost({ postId, shouldCache: true, shouldScrape: false });
}

async function ignoredTopicInfoHtml(ctx: IMenuContext) {
  const post = await getPostInfo(ctx.session.selectedIgnoredTopicPostId);
  const formattedDate = format(new Date(post.date), 'Pp');
  return `<b>Ignored Topic:</b>\n\n🏷️ <b>Title:</b> ${post.title}\n✍️ <b>Author:</b> ${post.author}\n🕗 <b>Date:</b> ${formattedDate}\n`;
}

const confirmRemoveIgnoredTopicMenu = new Menu<IMenuContext>('itr')
  .text('Yes, do it!', async (ctx) => {
    const removeIgnoredTopic = container.resolve(RemoveIgnoredTopicService);
    await removeIgnoredTopic.execute(ctx.session.selectedIgnoredTopicPostId, String(ctx.chat.id));
    ctx.session.selectedIgnoredTopicPostId = null;
    await editHtmlMenu(ctx, IGNORED_TOPICS_MENU_HTML, ignoredTopicsMenu);
  })
  .row()
  .back('No, go back!', async (ctx) => {
    await editHtml(ctx, await ignoredTopicInfoHtml(ctx));
  });

const ignoredTopicsMenuInfoMenu = new Menu<IMenuContext>('iti')
  .submenu('🚫 Stop Ignoring', 'itr', async (ctx) => {
    const post = await getPostInfo(ctx.session.selectedIgnoredTopicPostId);
    await editHtml(ctx, `Are you sure you want to stop ignoring the topic: <b>${post.title}</b>?`);
  })
  .row()
  .back('↩ Go Back', async (ctx) => {
    ctx.session.selectedIgnoredTopicPostId = null;
    await editHtml(ctx, IGNORED_TOPICS_MENU_HTML);
  });

const ignoredTopicsMenu = new Menu<IMenuContext>('itm')
  .dynamic(async (ctx, range) => {
    const findIgnoredTopicsByTelegramId = container.resolve(FindIgnoredTopicsByTelegramIdService);
    const ignoredTopics = await findIgnoredTopicsByTelegramId.execute(String(ctx.chat.id));
    const page = ctx.session.page ?? 0;
    const totalPages = Math.max(1, Math.ceil(ignoredTopics.length / 10));

    for (const choice of ignoredTopics.slice(page * 10, (page + 1) * 10)) {
      let title = choice.post.title.substring(0, 35);
      title += choice.post.title.length >= 35 ? '...' : '';
      range
        .submenu({ text: title, payload: String(choice.post.post_id) }, 'iti', async (menuCtx) => {
          menuCtx.session.selectedIgnoredTopicPostId = Number(menuCtx.match);
          await editHtml(menuCtx, await ignoredTopicInfoHtml(menuCtx));
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
    await addIgnoredTopicLinkQuestion.replyWithHTML(
      ctx,
      'What is the URL of the topic you want to ignore?',
    );
  })
  .back('↩ Go Back', async (ctx) => {
    await editHtml(ctx, "<b>Don't notify me about...</b>\n\nChoose what should be ignored.");
  });

ignoredTopicsMenu.register(ignoredTopicsMenuInfoMenu);
ignoredTopicsMenuInfoMenu.register(confirmRemoveIgnoredTopicMenu);

const addIgnoredTopicLinkQuestion = new StatelessQuestion(
  'addIgnoredTopic',
  async (ctx: IMenuContext) => {
    const text = ctx.message.text.toLowerCase().trim();

    if (!text.match(/bitcointalk.org\/index\.php\?topic=\d+/gi)) {
      await addIgnoredTopicLinkQuestion.replyWithHTML(
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

    const addIgnoredTopic = container.resolve(AddIgnoredTopicService);

    try {
      await ctx.api.editMessageText(
        statusMessage.chat.id,
        statusMessage.message_id,
        'We have added your request to the queue.\n\nThis will take a few seconds...',
      );
      await addIgnoredTopic.execute(Number(topicId[1]), String(ctx.message.chat.id));
      await ctx.api.deleteMessage(statusMessage.chat.id, statusMessage.message_id);
      await replyHtmlMenu(ctx, IGNORED_TOPICS_MENU_HTML, ignoredTopicsMenu);
    } catch (error) {
      await ctx.api.deleteMessage(statusMessage.chat.id, statusMessage.message_id).catch(() => {});

      if (error.message === 'Topic already being ignored.') {
        await ctx.reply('You are already ignoring this topic.', {
          reply_markup: { remove_keyboard: true },
        });
        return;
      }

      logger.error({ telegram_id: ctx.chat.id, error }, 'Error while adding Ignored Topic.');
      await ctx.reply('Something went wrong...', { reply_markup: { remove_keyboard: true } });
    }
  },
);

export { addIgnoredTopicLinkQuestion };
export default ignoredTopicsMenu;
