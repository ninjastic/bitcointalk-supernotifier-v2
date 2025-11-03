import { container } from 'tsyringe';
import type { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Menu } from '@grammyjs/menu';
import { replyMenuToContext } from 'grammy-inline-menu';
import { z } from 'zod';

import type IMenuContext from '../@types/IMenuContext';
import { mainMenu } from '../menus/mainMenu';
import type TrackedUser from '../../../../modules/posts/infra/typeorm/entities/TrackedUser';
import trackedUsersMenu from '../menus/trackedUsersMenu';
import TrackedUsersRepository from '../../../../modules/posts/infra/typeorm/repositories/TrackedUsersRepository';

export const confirmAddTrackedUserInlineMenu = new Menu('addTrackedUserConfirm')
  .text({ text: 'Yes, all posts', payload: 'yes-posts' })
  .row()
  .text({ text: 'Only new topics', payload: 'yes-topics' })
  .row()
  .text({ text: 'No', payload: 'no' });

export const cancelAddTrackedUserPromptInlineMenu = new Menu('cancelAddTrackedUser').text({ text: 'Cancel' });

const askForPrompt = async (
  conversation: Conversation<IMenuContext & ConversationFlavor>,
  ctx: IMenuContext
): Promise<TrackedUser | null> => {
  const trackedUsersRepository = container.resolve(TrackedUsersRepository);

  const promptMessage = await ctx.reply('What is the username of the user you want to track?', {
    reply_markup: cancelAddTrackedUserPromptInlineMenu
  });

  const { message, callbackQuery } = await conversation.wait();

  if (callbackQuery?.data.includes('cancelAddTrackedUser')) {
    await ctx.api.deleteMessage(ctx.chat.id, promptMessage.message_id);
    await replyMenuToContext(mainMenu, ctx, '/');
    return null;
  }

  if (!message?.text) {
    await conversation.skip();
  }

  const { text } = message;

  if (text === '/cancel' || text === '/menu') {
    await replyMenuToContext(mainMenu, ctx, '/tu/');
    return null;
  }

  const trackedUser = trackedUsersRepository.create({ telegram_id: String(ctx.chat.id), username: text.toLowerCase() });

  const validation = z.object({
    telegram_id: z.string(),
    username: z
      .string()
      .max(25)
      .regex(/^(?!.*bitcointalk\.org\/index\.php\?action=profile).*/),
    only_topics: z.boolean().optional()
  });

  if (!validation.safeParse(trackedUser).success) {
    await ctx.reply('Username is not valid, try again.');
    return askForPrompt(conversation, ctx);
  }

  await ctx.reply(`Do you want to track the user <b>${trackedUser.username}</b>?`, {
    parse_mode: 'HTML',
    reply_markup: confirmAddTrackedUserInlineMenu
  });

  const answerCb = await conversation.waitForCallbackQuery(/addTrackedUserConfirm/);

  if (answerCb.callbackQuery.data.match(/\/yes-topics\//)) {
    trackedUser.only_topics = true;
  }

  if (answerCb.callbackQuery.data.match(/yes/)) {
    await ctx.api.deleteMessage(ctx.chat.id, answerCb.callbackQuery.message.message_id);
    return trackedUser;
  }

  await ctx.api.deleteMessage(ctx.chat.id, answerCb.callbackQuery.message.message_id);
  return askForPrompt(conversation, ctx);
};

const addTrackedUserConversation = async (
  conversation: Conversation<IMenuContext & ConversationFlavor>,
  ctx: IMenuContext
): Promise<void> => {
  const trackedUsersRepository = container.resolve(TrackedUsersRepository);
  const newTrackedUser = await askForPrompt(conversation, ctx);

  if (!newTrackedUser) {
    return;
  }

  const userTrackedUsers = await trackedUsersRepository.findByTelegramId(String(ctx.chat.id));
  const trackedUserExists = userTrackedUsers.find(
    userTrackedUser => userTrackedUser.username === newTrackedUser.username
  );

  if (trackedUserExists) {
    await ctx.reply('You were already tracking this user.');
  }

  const insertedTrackedUser = await conversation.external(async () => trackedUsersRepository.save(newTrackedUser));
  if (insertedTrackedUser) {
    await ctx.reply(`You are now tracking the user:\n\n<b>${newTrackedUser.username}</b>`, { parse_mode: 'HTML' });
  }

  await replyMenuToContext(trackedUsersMenu, ctx, '/tu/');
};

export default addTrackedUserConversation;
