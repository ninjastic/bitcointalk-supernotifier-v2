import type { Conversation } from '@grammyjs/conversations';

import { Menu } from '@grammyjs/menu';
import { container } from 'tsyringe';
import { z } from 'zod';

import type TrackedUser from '../../../../modules/posts/infra/typeorm/entities/TrackedUser';
import type IMenuContext from '../@types/IMenuContext';

import TrackedUsersRepository from '../../../../modules/posts/infra/typeorm/repositories/TrackedUsersRepository';
import { mainMenu } from '../menus/mainMenu';
import { mainMenuHtml, replyHtmlMenuFromConversation } from '../menus/menu-utils';
import trackedUsersMenu from '../menus/trackedUsersMenu';
import { TRACKED_USERS_MENU_HTML } from '../menus/trackedUsersMenu';

export const confirmAddTrackedUserInlineMenu = new Menu('tuc')
  .text({ text: 'Yes, all posts', payload: 'yes-posts' })
  .row()
  .text({ text: 'Only new topics', payload: 'yes-topics' })
  .row()
  .text({ text: 'No', payload: 'no' });

export const cancelAddTrackedUserPromptInlineMenu = new Menu('tux').text({ text: 'Cancel' });

async function askForPrompt(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
): Promise<TrackedUser | null> {
  const trackedUsersRepository = container.resolve(TrackedUsersRepository);

  const promptMessage = await ctx.reply('What is the username of the user you want to track?', {
    reply_markup: cancelAddTrackedUserPromptInlineMenu,
  });

  while (true) {
    const { message, callbackQuery } = await conversation.wait();

    if (callbackQuery?.data.includes('tux')) {
      await ctx.api.deleteMessage(ctx.chat.id, promptMessage.message_id);
      await replyHtmlMenuFromConversation(conversation, ctx, mainMenuHtml, mainMenu);
      return null;
    }

    if (!message?.text) {
      continue;
    }

    const text = message.text;

    if (text === '/cancel' || text === '/menu') {
      await replyHtmlMenuFromConversation(conversation, ctx, mainMenuHtml, mainMenu);
      return null;
    }

    const trackedUser = trackedUsersRepository.create({
      telegram_id: String(ctx.chat.id),
      username: text.toLowerCase(),
    });

    const validation = z.object({
      telegram_id: z.string(),
      username: z
        .string()
        .max(25)
        .regex(/^(?!.*bitcointalk\.org\/index\.php\?action=profile).*/),
      only_topics: z.boolean().optional(),
    });

    if (!validation.safeParse(trackedUser).success) {
      await ctx.reply('Username is not valid, try again.');
      continue;
    }

    await ctx.reply(`Do you want to track the user <b>${trackedUser.username}</b>?`, {
      parse_mode: 'HTML',
      reply_markup: confirmAddTrackedUserInlineMenu,
    });

    const answerCb = await conversation.waitForCallbackQuery(/tuc/);

    if (answerCb.callbackQuery.data.match(/\/yes-topics\//)) {
      trackedUser.only_topics = true;
    }

    if (answerCb.callbackQuery.data.match(/yes/)) {
      await ctx.api.deleteMessage(ctx.chat.id, answerCb.callbackQuery.message.message_id);
      return trackedUser;
    }

    await ctx.api.deleteMessage(ctx.chat.id, answerCb.callbackQuery.message.message_id);
  }
}

async function addTrackedUserConversation(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
): Promise<void> {
  const trackedUsersRepository = container.resolve(TrackedUsersRepository);
  const newTrackedUser = await askForPrompt(conversation, ctx);

  if (!newTrackedUser) {
    return;
  }

  const userTrackedUsers = await trackedUsersRepository.findByTelegramId(String(ctx.chat.id));
  const trackedUserExists = userTrackedUsers.find(
    (userTrackedUser) => userTrackedUser.username === newTrackedUser.username,
  );

  if (trackedUserExists) {
    await ctx.reply('You were already tracking this user.');
  }

  await conversation.external(async () => trackedUsersRepository.save(newTrackedUser));

  await replyHtmlMenuFromConversation(conversation, ctx, TRACKED_USERS_MENU_HTML, trackedUsersMenu);
}

export default addTrackedUserConversation;
