import type { Menu } from '@grammyjs/menu';
import type { Conversation } from '@grammyjs/conversations';
import type { InlineKeyboardButton } from 'grammy/types';

import type IMenuContext from '../@types/IMenuContext';

type RenderableMenu = {
  render(ctx: IMenuContext): Promise<InlineKeyboardButton[][]>;
};

async function renderMenu(menu: Menu<IMenuContext>, ctx: IMenuContext) {
  return (menu as unknown as RenderableMenu).render(ctx);
}

export async function replyHtmlMenu(ctx: IMenuContext, html: string, menu: Menu<IMenuContext>) {
  await ctx.reply(html, {
    parse_mode: 'HTML',
    reply_markup: menu,
  });
}

export async function replyHtmlMenuFromConversation(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
  html: string | ((ctx: IMenuContext) => string),
  menu: Menu<IMenuContext>,
) {
  const data = await conversation.external(async (externalCtx) => {
    return {
      html: typeof html === 'function' ? html(externalCtx) : html,
      inlineKeyboard: await renderMenu(menu, externalCtx),
    };
  });

  await ctx.reply(data.html, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: data.inlineKeyboard },
  });
}

export async function replyRichMenuFromConversation(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
  html: string,
  menu: Menu<IMenuContext>,
) {
  const inlineKeyboard = await conversation.external(async (externalCtx) =>
    renderMenu(menu, externalCtx),
  );

  await ctx.replyWithRichMessage({ html }, { reply_markup: { inline_keyboard: inlineKeyboard } });
}

export async function editRichMenuFromConversation(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
  html: string,
  menu: Menu<IMenuContext>,
) {
  const message = ctx.callbackQuery?.message;
  if (!message) return false;

  const inlineKeyboard = await conversation.external(async (externalCtx) =>
    renderMenu(menu, externalCtx),
  );

  await ctx.api.editMessageText(
    message.chat.id,
    message.message_id,
    { html },
    { reply_markup: { inline_keyboard: inlineKeyboard } },
  );

  return true;
}

export async function editHtmlMenu(ctx: IMenuContext, html: string, menu: Menu<IMenuContext>) {
  await ctx.editMessageText(html, {
    parse_mode: 'HTML',
    reply_markup: menu,
  });
}

export async function editHtml(ctx: IMenuContext, html: string) {
  await ctx.editMessageText(html, { parse_mode: 'HTML' });
}

export async function editRich(ctx: IMenuContext, html: string) {
  const message = ctx.callbackQuery?.message;
  if (!message) return;

  await ctx.api.editMessageText(message.chat.id, message.message_id, { html });
}

export function mainMenuHtml(ctx: IMenuContext): string {
  const username = ctx.session.isGroup
    ? ctx.from.username || ctx.from.first_name
    : ctx.session.username || ctx.from.username || ctx.from.first_name;

  return `Hello, <b>${username}</b>.\nWhat would you like to manage?\n\nRun /help to see all available commands.`;
}

export async function replyRichMenu(ctx: IMenuContext, html: string, menu: Menu<IMenuContext>) {
  await ctx.replyWithRichMessage({ html }, { reply_markup: menu });
}

export async function editRichMenu(ctx: IMenuContext, html: string, menu: Menu<IMenuContext>) {
  const message = ctx.callbackQuery?.message;
  if (!message) return;

  await ctx.api.editMessageText(
    message.chat.id,
    message.message_id,
    { html },
    { reply_markup: menu },
  );
}
