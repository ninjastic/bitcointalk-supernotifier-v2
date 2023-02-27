import { container } from 'tsyringe';
import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Menu } from '@grammyjs/menu';
import { replyMenuToContext } from 'grammy-inline-menu';

import IMenuContext from '../@types/IMenuContext';
import { mainMenu } from '../menus/mainMenu';
import TrackedUser from '../../../../modules/posts/infra/typeorm/entities/TrackedUser';
import trackedUsersMenu from '../menus/trackedUsersMenu';
import TrackedUsersRepository from '../../../../modules/posts/infra/typeorm/repositories/TrackedUsersRepository';

export const confirmAddTrackedUserInlineMenu = new Menu('addTrackedUserConfirm')
  .text({ text: 'Yes', payload: 'yes' })
  .text({ text: 'No, try again', payload: 'no' });

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
    await ctx.api.deleteMessage(ctx.from.id, promptMessage.message_id);
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

  const trackedUser = trackedUsersRepository.create({ telegram_id: String(ctx.from.id), username: text.toLowerCase() });

  await ctx.reply(`Do you want to add the user <b>${trackedUser.username}</b>?`, {
    parse_mode: 'HTML',
    reply_markup: confirmAddTrackedUserInlineMenu
  });

  const answerCb = await conversation.waitForCallbackQuery(/addTrackedUserConfirm/);

  if (answerCb.callbackQuery.data.match(/\/yes\//)) {
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

  const userTrackedUsers = await trackedUsersRepository.findByTelegramId(String(ctx.from.id));
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
