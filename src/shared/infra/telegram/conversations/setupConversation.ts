import type { Conversation } from '@grammyjs/conversations';

import { Menu } from '@grammyjs/menu';
import { InlineKeyboard } from 'grammy';
import { container } from 'tsyringe';

import type IMenuContext from '../@types/IMenuContext';

import CreateUserService from '../../../../modules/users/services/CreateUserService';
import { mainMenu } from '../menus/mainMenu';
import { mainMenuHtml, replyHtmlMenuFromConversation } from '../menus/menu-utils';
import FindUserByTelegramIdService from '../services/FindUserByTelegramIdService';
import UpdateUserByTelegramIdService from '../services/UpdateUserByTelegramIdService';

const uidHelpInlineMenu = new Menu('uh').text("I don't know", async (ctx) =>
  ctx.replyWithPhoto('https://i.imgur.com/XFB3TeA.png'),
);

async function askForPrompt(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
  type: 'username' | 'userId',
): Promise<string | number> {
  const typeText = type === 'username' ? 'username' : 'UID';

  await ctx.reply(`What is your BitcoinTalk ${typeText}?`, {
    reply_markup: type === 'userId' ? uidHelpInlineMenu : null,
  });

  const input =
    type === 'username' ? await conversation.form.text() : await conversation.form.number();

  const confirmMenu = new InlineKeyboard()
    .text('Yes', 'setup-confirm:yes')
    .text('No', 'setup-confirm:no');

  if (['/menu', '/start'].includes(input.toString().toLowerCase())) {
    await ctx.reply(`I don't think your ${typeText} is ${input}... let's try again.`);
    return askForPrompt(conversation, ctx, type);
  }

  const promptMsg = await ctx.reply(`Is your BitcoinTalk ${typeText} <b>${input}</b>?`, {
    parse_mode: 'HTML',
    reply_markup: confirmMenu,
  });

  const cb = await conversation.waitForCallbackQuery(/^setup-confirm:(yes|no)$/);
  const answer = cb.callbackQuery.data === 'setup-confirm:yes';

  await ctx.api.deleteMessage(ctx.chat.id, promptMsg.message_id);

  if (answer) {
    return input;
  }

  return askForPrompt(conversation, ctx, type);
}

async function askForConfirmation(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
  type: string,
): Promise<boolean> {
  const confirmMenu = new InlineKeyboard()
    .text('Yes', `setup-${type}:yes`)
    .text('No', `setup-${type}:no`);

  const promptMsg = await ctx.reply(`Do you want to be notified of new <b>${type}</b>?`, {
    parse_mode: 'HTML',
    reply_markup: confirmMenu,
  });

  const cb = await conversation.waitForCallbackQuery(new RegExp(`^setup-${type}:(yes|no)$`));
  const answer = cb.callbackQuery.data === `setup-${type}:yes`;

  await ctx.api.editMessageText(
    ctx.chat.id,
    promptMsg.message_id,
    answer ? `✅ We will notify you of new ${type}` : `🚫 We won't notify you of new ${type}`,
    { reply_markup: null },
  );

  if (answer) {
    return true;
  }

  return false;
}

async function askForMentionType(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
): Promise<boolean> {
  const mentionTypeMenu = new InlineKeyboard()
    .text('All mentions', 'setup-mention-type:all')
    .text('Only quotes and @ tags', 'setup-mention-type:direct');
  const username = await conversation.external((externalCtx) => externalCtx.session.username);

  const promptMsg = await ctx.reply(
    `Do you want to be notified every time someone writes your username <b>${username}</b>...\n\nOr <b>only</b> when they quote your post or tag you with <b>@${username}</b>?`,
    {
      parse_mode: 'HTML',
      reply_markup: mentionTypeMenu,
    },
  );

  const cb = await conversation.waitForCallbackQuery(/^setup-mention-type:(all|direct)$/);
  const answer = cb.callbackQuery.data === 'setup-mention-type:all';

  await ctx.api.editMessageText(
    ctx.chat.id,
    promptMsg.message_id,
    answer
      ? `✅ We will notify you of <b>all mentions</b>`
      : `✅ We will only notify you of <b>quotes</b> and <b>@ tags</b>`,
    { parse_mode: 'HTML', reply_markup: null },
  );

  if (answer) {
    return true;
  }

  return false;
}

async function setupConversation(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
): Promise<void> {
  const username = (await askForPrompt(conversation, ctx, 'username')) as string;
  await conversation.external((externalCtx) => {
    externalCtx.session.username = username;
  });

  const userId = (await askForPrompt(conversation, ctx, 'userId')) as number;
  await conversation.external((externalCtx) => {
    externalCtx.session.userId = userId;
  });

  const mentionsEnabled = await askForConfirmation(conversation, ctx, 'mentions');
  await conversation.external((externalCtx) => {
    externalCtx.session.mentions = mentionsEnabled;
    externalCtx.session.ignoreNestedQuotes = false;
  });

  if (mentionsEnabled) {
    const onlyDirectMentions = await askForMentionType(conversation, ctx);
    await conversation.external((externalCtx) => {
      externalCtx.session.onlyDirectMentions = onlyDirectMentions;
    });
  }

  const meritsEnabled = await askForConfirmation(conversation, ctx, 'merits');
  await conversation.external((externalCtx) => {
    externalCtx.session.merits = meritsEnabled;
    externalCtx.session.isGroup = false;
  });

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
      enable_ignore_nested_quotes: false,
      enable_merits: meritsEnabled,
      language: 'en',
      telegram_id: String(ctx.chat.id),
      blocked: false,
      is_group: false,
    });
  } else {
    await createUser.execute({
      user_id: userId,
      username,
      alternative_usernames: [],
      enable_mentions: mentionsEnabled,
      enable_ignore_nested_quotes: false,
      enable_merits: meritsEnabled,
      language: 'en',
      telegram_id: String(ctx.chat.id),
      blocked: false,
      is_group: false,
    });
  }

  await replyHtmlMenuFromConversation(conversation, ctx, mainMenuHtml, mainMenu);
}

export { setupConversation, uidHelpInlineMenu };
