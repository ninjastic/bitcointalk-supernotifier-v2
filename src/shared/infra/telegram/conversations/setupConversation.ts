import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { replyMenuToContext } from 'grammy-inline-menu';
import { Menu } from '@grammyjs/menu';
import { container } from 'tsyringe';

import IMenuContext from '../@types/IMenuContext';
import CreateUserService from '../../../../modules/users/services/CreateUserService';
import FindUserByTelegramIdService from '../services/FindUserByTelegramIdService';
import UpdateUserByTelegramIdService from '../services/UpdateUserByTelegramIdService';

import { mainMenu } from '../menus/mainMenu';

const uidHelpInlineMenu = new Menu('uidHelp').text("I don't know", async ctx =>
  ctx.replyWithPhoto('https://i.imgur.com/XFB3TeA.png')
);

const askForPrompt = async (
  conversation: Conversation<IMenuContext & ConversationFlavor>,
  ctx: IMenuContext,
  type: 'username' | 'userId'
): Promise<string | number> => {
  const typeText = type === 'username' ? 'username' : 'UID';

  await ctx.reply(`What is your BitcoinTalk ${typeText}?`, {
    reply_markup: type === 'userId' ? uidHelpInlineMenu : null
  });

  const input = type === 'username' ? await conversation.form.text() : await conversation.form.number();

  const confirmMenu = new Menu<IMenuContext & ConversationFlavor>('confirm').text('Yes').text('No');
  await conversation.run(confirmMenu);

  if (['/menu', '/start'].includes(input.toString().toLowerCase())) {
    await ctx.reply(`I don't think your ${typeText} is ${input}... let's try again.`)
    return askForPrompt(conversation, ctx, type);
  }

  const promptMsg = await ctx.reply(`Is your BitcoinTalk ${typeText} <b>${input}</b>?`, {
    parse_mode: 'HTML',
    reply_markup: confirmMenu
  });

  const cb = await conversation.waitForCallbackQuery(/confirm/);
  const answer = cb.callbackQuery.data.match(/\/0\/0\//) !== null; // true if "Yes"

  await ctx.api.deleteMessage(ctx.chat.id, promptMsg.message_id);

  if (answer) {
    return input;
  }

  return askForPrompt(conversation, ctx, type);
};

const askForConfirmation = async (
  conversation: Conversation<IMenuContext>,
  ctx: IMenuContext,
  type: string
): Promise<boolean> => {
  const confirmMenu = new Menu<IMenuContext>('confirm').text('Yes').text('No');
  await conversation.run(confirmMenu);

  const promptMsg = await ctx.reply(`Do you want to be notified of new <b>${type}</b>?`, {
    parse_mode: 'HTML',
    reply_markup: confirmMenu
  });

  const cb = await conversation.waitForCallbackQuery(/confirm/);
  const answer = cb.callbackQuery.data.match(/\/0\/0\//) !== null; // true if "Yes"

  await ctx.api.editMessageText(
    ctx.chat.id,
    promptMsg.message_id,
    answer ? `✅ We will notify you of new ${type}` : `🚫 We won't notify you of new ${type}`,
    { reply_markup: null }
  );

  if (answer) {
    return true;
  }

  return false;
};

const askForMentionType = async (conversation: Conversation<IMenuContext>, ctx: IMenuContext): Promise<boolean> => {
  const mentionTypeMenu = new Menu<IMenuContext>('mentionTypeMenu').text('All mentions').text('Only quotes and @ tags');
  await conversation.run(mentionTypeMenu);

  const promptMsg = await ctx.reply(
    `Do you want to be notified every time someone writes your username <b>${ctx.from.username}</b>...\n\nOr <b>only</b> when they quote your post or tag you with <b>@${ctx.from.username}</b>?`,
    {
      parse_mode: 'HTML',
      reply_markup: mentionTypeMenu
    }
  );

  const cb = await conversation.waitForCallbackQuery(/mentionTypeMenu/);
  const answer = cb.callbackQuery.data.match(/\/0\/0\//) !== null; // true if "All mentions"

  await ctx.api.editMessageText(
    ctx.chat.id,
    promptMsg.message_id,
    answer
      ? `✅ We will notify you of <b>all mentions</b>`
      : `✅ We will only notify you of <b>quotes</b> and <b>@ tags</b>`,
    { parse_mode: 'HTML', reply_markup: null }
  );

  if (answer) {
    return true;
  }

  return false;
};

const setupConversation = async (
  conversation: Conversation<IMenuContext & ConversationFlavor>,
  ctx: IMenuContext
): Promise<void> => {
  const username = (await askForPrompt(conversation, ctx, 'username')) as string;
  const userId = (await askForPrompt(conversation, ctx, 'userId')) as number;

  const mentionsEnabled = await askForConfirmation(conversation, ctx, 'mentions');

  if (mentionsEnabled) {
    const onlyDirectMentions = await askForMentionType(conversation, ctx);
    conversation.session.onlyDirectMentions = onlyDirectMentions;
  }

  const meritsEnabled = await askForConfirmation(conversation, ctx, 'merits');

  conversation.session.username = username;
  conversation.session.userId = userId;
  conversation.session.mentions = mentionsEnabled;
  conversation.session.merits = meritsEnabled;
  conversation.session.isGroup = false;

  const createUser = container.resolve(CreateUserService);
  const findUserByTelegramId = container.resolve(FindUserByTelegramIdService);
  const updateUserByTelegramId = container.resolve(UpdateUserByTelegramIdService);

  const userExists = await findUserByTelegramId.execute(String(ctx.chat.id));

  if (userExists) {
    await updateUserByTelegramId.execute(String(ctx.chat.id), {
      user_id: userId,
      username,
      alternative_usernames: [],
      enable_mentions: mentionsEnabled,
      enable_merits: meritsEnabled,
      language: 'en',
      telegram_id: String(ctx.chat.id),
      blocked: false,
      is_group: false
    });
  } else {
    await createUser.execute({
      user_id: userId,
      username,
      alternative_usernames: [],
      enable_mentions: mentionsEnabled,
      enable_merits: meritsEnabled,
      language: 'en',
      telegram_id: String(ctx.chat.id),
      blocked: false,
      is_group: false
    });
  }

  await replyMenuToContext(mainMenu, ctx, '/');
};

export { setupConversation, uidHelpInlineMenu };
