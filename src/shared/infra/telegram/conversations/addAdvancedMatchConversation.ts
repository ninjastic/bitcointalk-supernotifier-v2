import type { Conversation } from '@grammyjs/conversations';
import { InlineKeyboard } from 'grammy';
import { getManager } from 'typeorm';
import { container } from 'tsyringe';
import escape from 'escape-html';

import type ICreateAdvancedMatchDTO from '../../../../modules/posts/dtos/ICreateAdvancedMatchDTO';
import type IMenuContext from '../@types/IMenuContext';
import type {
  AdvancedMatchDraft,
  AdvancedMatchDraftField,
  DraftAuthor,
  DraftBoard,
  DraftTopic,
} from '../@types/ISession';

import CreateAdvancedMatchService from '../services/CreateAdvancedMatchService';
import UpdateAdvancedMatchService from '../services/UpdateAdvancedMatchService';
import { advancedMatchListMenu, formatDraft, LIST_HTML } from '../menus/advancedMatchesMenu';
import { mainMenu } from '../menus/mainMenu';
import {
  editRichMenuFromConversation,
  mainMenuHtml,
  replyHtmlMenuFromConversation,
  replyRichMenuFromConversation,
} from '../menus/menu-utils';
import GetBoardNameFromIdService from '../../../../modules/posts/services/GetBoardNameFromIdService';

// --- Constants ---

const CANCEL = 'amp:cancel';
const CLEAR = 'amp:clear';
const MENU_PREFIX = 'amd';
const CMD_MENU = '/menu';
const CMD_EMPTY = '/empty';
const MULTI_PREFIX = 'amf:';

const FIELD_LABELS: Record<AdvancedMatchDraftField, string> = {
  name: 'name',
  title_regex: 'title regex',
  content_regex: 'content regex',
  authors: 'exact author username',
  boards: 'board ID or bitcointalk.org URL',
  topics: 'topic ID or bitcointalk.org URL',
};

const BOARD_URL_PATTERN = /bitcointalk\.org\/index\.php\?board=(\d+)/i;
const TOPIC_URL_PATTERN = /bitcointalk\.org\/index\.php\?topic=(\d+)/i;

// --- Pure Utilities ---

function hasAnyFilter(draft: AdvancedMatchDraft): boolean {
  return Boolean(
    draft.title_regex ||
    draft.content_regex ||
    draft.authors?.length ||
    draft.boards?.length ||
    draft.topics?.length,
  );
}

function validateRegex(value: string): void {
  RegExp(value, 'i');
}

function parseUrlOrId(value: string, type: 'board' | 'topic'): number {
  const pattern = type === 'board' ? BOARD_URL_PATTERN : TOPIC_URL_PATTERN;
  const match = value.match(pattern);
  if (match) return Number(match[1]);
  if (/^\d+$/.test(value)) return Number(value);
  throw new Error(`Enter a ${type} ID or a bitcointalk.org ${type} URL.`);
}

function isNotModifiedError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('message is not modified');
}

function promptText(field: AdvancedMatchDraftField): string {
  return `Send the ${FIELD_LABELS[field]}.\n\nSend /empty to clear this field.`;
}

function promptKeyboard(field: AdvancedMatchDraftField): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (field !== 'name') kb.text('Clear', CLEAR).row();
  return kb.text('Cancel', CANCEL);
}

function toDTO(draft: AdvancedMatchDraft, telegramId: string): ICreateAdvancedMatchDTO {
  return {
    telegram_id: telegramId,
    name: draft.name!,
    title_regex: draft.title_regex || null,
    content_regex: draft.content_regex || null,
    authors: draft.authors?.map((a) => a.author) || [],
    board_ids: draft.boards?.map((b) => b.board_id) || [],
    topic_ids: draft.topics?.map((t) => t.topic_id) || [],
    only_topics: Boolean(draft.only_topics),
  };
}

// --- Multi-field helpers ---

function multiFieldListHtml(field: 'authors' | 'boards' | 'topics'): string {
  const label = field === 'authors' ? 'Authors' : field === 'boards' ? 'Boards' : 'Topics';
  const desc = field === 'authors' ? 'authors' : field === 'boards' ? 'boards' : 'topics';
  return `<b>${label}</b>\n\nAdd or remove ${desc} for this advanced match rule.`;
}

function multiFieldItemLabel(
  field: 'authors' | 'boards' | 'topics',
  item: DraftAuthor | DraftBoard | DraftTopic,
): string {
  if (field === 'authors') return (item as DraftAuthor).author;
  if (field === 'boards') {
    const b = item as DraftBoard;
    return b.name ?? `Board ${b.board_id}`;
  }
  const t = item as DraftTopic;
  return t.title ?? `Topic ${t.topic_id}`;
}

function buildMultiKeyboard(
  field: 'authors' | 'boards' | 'topics',
  draft: AdvancedMatchDraft,
): InlineKeyboard {
  const kb = new InlineKeyboard();
  const items =
    field === 'authors' ? draft.authors : field === 'boards' ? draft.boards : draft.topics;

  if (items?.length) {
    items.forEach((item, i) => {
      const label = multiFieldItemLabel(field, item);
      const btnText = label.length > 30 ? `${label.slice(0, 30)}…` : label;
      kb.text(btnText, `${MULTI_PREFIX}item:${i}`);
    });
    kb.row();
  }

  kb.text('✨ Add', `${MULTI_PREFIX}add`);
  kb.text('↩ Go Back', `${MULTI_PREFIX}done`);
  return kb;
}

// --- Async Utilities (I/O, no conversation dependency) ---

async function resolveBoardName(boardId: number): Promise<string | null> {
  const getBoardName = container.resolve(GetBoardNameFromIdService);
  return (await getBoardName.execute(boardId)) || null;
}

async function resolveTopicTitle(topicId: number): Promise<string | null> {
  const result = await getManager().query(
    'SELECT p.title FROM topics t JOIN posts p ON t.post_id = p.post_id WHERE t.topic_id = $1 LIMIT 1',
    [topicId],
  );
  return result.length ? result[0].title : null;
}

async function applyFieldValue(
  draft: AdvancedMatchDraft,
  field: AdvancedMatchDraftField,
  text: string,
): Promise<void> {
  if (text === CMD_EMPTY) {
    if (field === 'authors') draft.authors = [];
    else if (field === 'boards') draft.boards = [];
    else if (field === 'topics') draft.topics = [];
    else if (field === 'name') draft.name = null;
    else (draft as any)[field] = null;
    return;
  }

  if (field === 'title_regex' || field === 'content_regex') {
    validateRegex(text);
    (draft as any)[field] = text;
    return;
  }

  if (field === 'name') {
    draft.name = text;
    return;
  }

  throw new Error(`Unexpected single-value field: ${field}`);
}

async function appendMultiFieldValue(
  draft: AdvancedMatchDraft,
  field: 'authors' | 'boards' | 'topics',
  text: string,
): Promise<void> {
  if (field === 'authors') {
    draft.authors ??= [];
    draft.authors.push({ author: text.toLowerCase() });
    return;
  }

  if (field === 'boards') {
    const id = parseUrlOrId(text, 'board');
    const name = await resolveBoardName(id);
    draft.boards ??= [];
    draft.boards.push({ board_id: id, name });
    return;
  }

  if (field === 'topics') {
    const id = parseUrlOrId(text, 'topic');
    const title = await resolveTopicTitle(id);
    draft.topics ??= [];
    draft.topics.push({ topic_id: id, title });
    return;
  }
}

// --- Conversation Helpers ---

async function getDraftFromSession(
  conversation: Conversation<IMenuContext, IMenuContext>,
): Promise<AdvancedMatchDraft> {
  return conversation.external((outsideCtx) => {
    outsideCtx.session.advancedMatchDraft ??= { only_topics: false };
    outsideCtx.session.advancedMatchDraftField = null;
    return outsideCtx.session.advancedMatchDraft;
  });
}

async function clearDraftSession(
  conversation: Conversation<IMenuContext, IMenuContext>,
): Promise<void> {
  await conversation.external((ctx) => {
    ctx.session.advancedMatchDraft = null;
    ctx.session.advancedMatchDraftField = null;
    ctx.session.advancedMatchListPage = 0;
    ctx.session.advancedMatchCurrentMatchId = null;
  });
}

async function editDraftMessage(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
): Promise<void> {
  const draft = await getDraftFromSession(conversation);
  if (!ctx.msg) return;
  ctx.menu.update();
  await ctx.msg.editText('', { rich_message: { html: formatDraft(draft) } }).catch((error) => {
    if (!isNotModifiedError(error)) throw error;
  });
}

async function saveDraft(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
): Promise<boolean> {
  const draft = await getDraftFromSession(conversation);

  if (!draft.name || !draft.name.trim()) {
    await ctx.reply('A name is required before saving.');
    return false;
  }

  if (!hasAnyFilter(draft)) {
    await ctx.reply('Add at least one filter before saving.');
    return false;
  }

  const result = await conversation.external(async (externalCtx) => {
    const telegramId = String(externalCtx.chat.id);

    try {
      if (draft.id) {
        const update = container.resolve(UpdateAdvancedMatchService);
        await update.execute(draft.id, telegramId, toDTO(draft, telegramId) as any);
      } else {
        const create = container.resolve(CreateAdvancedMatchService);
        await create.execute(toDTO(draft, telegramId));
      }

      externalCtx.session.advancedMatchDraft = null;
      externalCtx.session.advancedMatchDraftField = null;
      externalCtx.session.advancedMatchListPage = 0;
      externalCtx.session.advancedMatchCurrentMatchId = null;

      return {
        ok: true,
        message: draft.id ? '✅ Advanced match updated.' : '✅ Advanced match saved.',
      };
    } catch (error) {
      return {
        ok: false,
        message: `Could not save advanced match: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  });

  if (!result.ok) {
    await ctx.reply(result.message);
    return false;
  }

  if (!(await editRichMenuFromConversation(conversation, ctx, LIST_HTML, advancedMatchListMenu))) {
    await replyRichMenuFromConversation(conversation, ctx, LIST_HTML, advancedMatchListMenu);
  }
  return true;
}

async function backToList(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
): Promise<void> {
  await clearDraftSession(conversation);
  if (!(await editRichMenuFromConversation(conversation, ctx, LIST_HTML, advancedMatchListMenu))) {
    await replyRichMenuFromConversation(conversation, ctx, LIST_HTML, advancedMatchListMenu);
  }
}

async function showMultiFieldMenu(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
  field: 'authors' | 'boards' | 'topics',
): Promise<void> {
  const draft = await getDraftFromSession(conversation);
  const html = multiFieldListHtml(field);
  const kb = buildMultiKeyboard(field, draft);
  await ctx.msg?.editText(html, { parse_mode: 'HTML', reply_markup: kb }).catch(() => {});
}

async function showItemDetail(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
  field: 'authors' | 'boards' | 'topics',
  index: number,
): Promise<void> {
  const draft = await getDraftFromSession(conversation);
  const items =
    field === 'authors' ? draft.authors : field === 'boards' ? draft.boards : draft.topics;

  if (!items || index >= items.length) return;

  const item = items[index];
  const label = multiFieldItemLabel(field, item);
  const typeLabel = field === 'authors' ? 'Author' : field === 'boards' ? 'Board' : 'Topic';

  let display: string;
  if (field === 'authors') {
    display = `<code>${escape(label)}</code>`;
  } else if (field === 'boards') {
    const b = item as DraftBoard;
    display = b.name
      ? `<code>${escape(b.name)}</code> (<code>${b.board_id}</code>)`
      : `<code>${b.board_id}</code>`;
  } else {
    const t = item as DraftTopic;
    display = t.title
      ? `${escape(t.title)} (<code>${t.topic_id}</code>)`
      : `<code>${t.topic_id}</code>`;
  }

  const kb = new InlineKeyboard()
    .text('🗑️ Remove', `${MULTI_PREFIX}remove:${index}`)
    .row()
    .text('↩ Go Back', `${MULTI_PREFIX}itemback`);

  await ctx.msg
    ?.editText(`<b>${typeLabel}</b>\n\n${display}`, { parse_mode: 'HTML', reply_markup: kb })
    .catch(() => {});
}

async function showConfirmRemove(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
  field: 'authors' | 'boards' | 'topics',
  index: number,
): Promise<void> {
  const draft = await getDraftFromSession(conversation);
  const items =
    field === 'authors' ? draft.authors : field === 'boards' ? draft.boards : draft.topics;

  if (!items || index >= items.length) return;

  const label = multiFieldItemLabel(field, items[index]);
  const kb = new InlineKeyboard()
    .text('Yes, do it!', `${MULTI_PREFIX}confirmremove:${index}`)
    .row()
    .text('No, go back!', `${MULTI_PREFIX}itemback`);

  await ctx.msg
    ?.editText(`Are you sure you want to remove <b>${escape(label)}</b>?`, {
      parse_mode: 'HTML',
      reply_markup: kb,
    })
    .catch(() => {});
}

async function askMultiField(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
  field: 'authors' | 'boards' | 'topics',
): Promise<void> {
  if (!ctx.msg) return;

  let state: 'list' | 'detail' | 'confirm_remove' = 'list';
  let selectedIndex: number | null = null;

  await showMultiFieldMenu(conversation, ctx, field);

  while (true) {
    const response = await conversation.wait();

    if (response.callbackQuery?.data === `${MULTI_PREFIX}done`) {
      await response.answerCallbackQuery().catch(() => {});
      await editDraftMessage(conversation, ctx);
      return;
    }

    if (state === 'list') {
      if (response.callbackQuery?.data === `${MULTI_PREFIX}add`) {
        await response.answerCallbackQuery().catch(() => {});
        const prompt = `Send the ${FIELD_LABELS[field]} to add.`;
        const addKb = new InlineKeyboard().text('↩ Go Back', `${MULTI_PREFIX}canceladd`);
        await ctx.msg?.editText(prompt, { reply_markup: addKb }).catch(() => {});

        while (true) {
          const textResponse = await conversation.wait();

          if (textResponse.callbackQuery?.data === `${MULTI_PREFIX}canceladd`) {
            await textResponse.answerCallbackQuery().catch(() => {});
            break;
          }

          if (!textResponse.message?.text) {
            await conversation.skip();
            return;
          }

          const text = textResponse.message.text.trim();
          await textResponse.msg?.delete().catch(() => {});

          if (text === CMD_MENU) {
            await ctx.msg?.delete().catch(() => {});
            await clearDraftSession(conversation);
            await replyHtmlMenuFromConversation(conversation, textResponse, mainMenuHtml, mainMenu);
            await conversation.halt();
            return;
          }

          try {
            await conversation.external(async (outsideCtx) => {
              const draft = outsideCtx.session.advancedMatchDraft ?? { only_topics: false };
              await appendMultiFieldValue(draft, field, text);
              outsideCtx.session.advancedMatchDraft = draft;
            });
            break;
          } catch (error) {
            await ctx.msg
              ?.editText(
                `❌ Invalid value: ${error instanceof Error ? error.message : String(error)}\n\n${prompt}`,
                { reply_markup: addKb },
              )
              .catch(() => {});
          }
        }

        await showMultiFieldMenu(conversation, ctx, field);
        continue;
      }

      const itemMatch = response.callbackQuery?.data?.match(
        new RegExp(`^${MULTI_PREFIX}item:(\\d+)$`),
      );
      if (itemMatch) {
        await response.answerCallbackQuery().catch(() => {});
        selectedIndex = parseInt(itemMatch[1], 10);
        state = 'detail';
        await showItemDetail(conversation, ctx, field, selectedIndex);
        continue;
      }
    }

    if (state === 'detail') {
      if (response.callbackQuery?.data === `${MULTI_PREFIX}remove:${selectedIndex}`) {
        await response.answerCallbackQuery().catch(() => {});
        state = 'confirm_remove';
        await showConfirmRemove(conversation, ctx, field, selectedIndex!);
        continue;
      }

      if (response.callbackQuery?.data === `${MULTI_PREFIX}itemback`) {
        await response.answerCallbackQuery().catch(() => {});
        state = 'list';
        selectedIndex = null;
        await showMultiFieldMenu(conversation, ctx, field);
        continue;
      }
    }

    if (state === 'confirm_remove') {
      if (response.callbackQuery?.data === `${MULTI_PREFIX}confirmremove:${selectedIndex}`) {
        await response.answerCallbackQuery().catch(() => {});
        await conversation.external((outsideCtx) => {
          const draft = outsideCtx.session.advancedMatchDraft ?? { only_topics: false };
          if (field === 'authors') draft.authors?.splice(selectedIndex!, 1);
          else if (field === 'boards') draft.boards?.splice(selectedIndex!, 1);
          else if (field === 'topics') draft.topics?.splice(selectedIndex!, 1);
          outsideCtx.session.advancedMatchDraft = draft;
        });
        state = 'list';
        selectedIndex = null;
        await showMultiFieldMenu(conversation, ctx, field);
        continue;
      }

      if (response.callbackQuery?.data === `${MULTI_PREFIX}itemback`) {
        await response.answerCallbackQuery().catch(() => {});
        state = 'detail';
        await showItemDetail(conversation, ctx, field, selectedIndex!);
        continue;
      }
    }
  }
}

async function askField(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
  field: AdvancedMatchDraftField,
): Promise<void> {
  if (!ctx.msg) return;

  await ctx.msg.editText(promptText(field), { reply_markup: promptKeyboard(field) });

  while (true) {
    const response = await conversation.wait();

    if (response.callbackQuery?.data === CANCEL) {
      await response.answerCallbackQuery().catch(() => {});
      await conversation.external((outsideCtx) => {
        outsideCtx.session.advancedMatchDraftField = null;
      });
      await editDraftMessage(conversation, ctx);
      return;
    }

    if (response.callbackQuery?.data === CLEAR) {
      await response.answerCallbackQuery().catch(() => {});
      await conversation.external((outsideCtx) => {
        if (outsideCtx.session.advancedMatchDraft) {
          const draft = outsideCtx.session.advancedMatchDraft;
          if (field === 'authors') draft.authors = [];
          else if (field === 'boards') draft.boards = [];
          else if (field === 'topics') draft.topics = [];
          else if (field === 'name') draft.name = null;
          else (draft as any)[field] = null;
        }
        outsideCtx.session.advancedMatchDraftField = null;
      });
      await editDraftMessage(conversation, ctx);
      return;
    }

    if (!response.message?.text) {
      await conversation.skip();
      return;
    }

    const text = response.message.text.trim();
    await response.msg?.delete().catch(() => {});

    if (text === CMD_MENU) {
      await ctx.msg?.delete().catch(() => {});
      await clearDraftSession(conversation);
      await replyHtmlMenuFromConversation(conversation, response, mainMenuHtml, mainMenu);
      await conversation.halt();
      return;
    }

    try {
      await conversation.external(async (outsideCtx) => {
        const draft = outsideCtx.session.advancedMatchDraft ?? { only_topics: false };
        await applyFieldValue(draft, field, text);
        outsideCtx.session.advancedMatchDraft = draft;
        outsideCtx.session.advancedMatchDraftField = null;
      });
      await editDraftMessage(conversation, ctx);
      return;
    } catch (error) {
      await ctx.msg
        ?.editText(
          `❌ Invalid value: ${error instanceof Error ? error.message : String(error)}\n\n${promptText(field)}`,
          { reply_markup: promptKeyboard(field) },
        )
        .catch(() => {});
    }
  }
}

// --- Main Conversation ---

async function addAdvancedMatchConversation(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
): Promise<void> {
  let draft = await getDraftFromSession(conversation);

  if (!draft.id) {
    if (ctx.callbackQuery) await ctx.deleteMessage().catch(() => {});
    const cancelKb = new InlineKeyboard().text('↩ Go Back', CANCEL);
    const promptMsg = await ctx.reply('Send the name for this advanced match rule.', {
      reply_markup: cancelKb,
    });

    while (true) {
      const response = await conversation.wait();

      if (response.callbackQuery?.data === CANCEL) {
        await response.answerCallbackQuery().catch(() => {});
        await clearDraftSession(conversation);
        await promptMsg.delete().catch(() => {});
        await replyRichMenuFromConversation(
          conversation,
          response,
          LIST_HTML,
          advancedMatchListMenu,
        );
        await conversation.halt();
        return;
      }

      if (response.message?.text === CMD_MENU) {
        await promptMsg.delete().catch(() => {});
        await response.msg?.delete().catch(() => {});
        await clearDraftSession(conversation);
        await replyHtmlMenuFromConversation(conversation, response, mainMenuHtml, mainMenu);
        await conversation.halt();
        return;
      }

      if (!response.message?.text) {
        await conversation.skip();
        return;
      }

      const text = response.message.text.trim();
      await response.msg?.delete().catch(() => {});

      if (text) {
        await conversation.external((outsideCtx) => {
          const d = outsideCtx.session.advancedMatchDraft ?? { only_topics: false };
          d.name = text;
          outsideCtx.session.advancedMatchDraft = d;
          outsideCtx.session.advancedMatchDraftField = null;
        });
        await promptMsg.delete().catch(() => {});
        break;
      }

      await ctx.reply('Name cannot be empty. Send a name for this rule.', {
        reply_markup: cancelKb,
      });
    }

    draft = await getDraftFromSession(conversation);
  }

  const menu = conversation
    .menu(MENU_PREFIX, { fingerprint: () => MENU_PREFIX })
    .text('📝 Name', (menuCtx) => askField(conversation, menuCtx, 'name'))
    .text('🔍 Title regex', (menuCtx) => askField(conversation, menuCtx, 'title_regex'))
    .row()
    .text('📄 Content regex', (menuCtx) => askField(conversation, menuCtx, 'content_regex'))
    .text('👤 Authors', (menuCtx) => askMultiField(conversation, menuCtx, 'authors'))
    .row()
    .text('🗂️ Boards', (menuCtx) => askMultiField(conversation, menuCtx, 'boards'))
    .text('🏷️ Topics', (menuCtx) => askMultiField(conversation, menuCtx, 'topics'))
    .row()
    .text(
      async () => {
        const session = await conversation.external((outsideCtx) => outsideCtx.session);
        return session.advancedMatchDraft?.only_topics
          ? '✅ Only New Topics Enabled'
          : '🚫 Only New Topics Disabled';
      },
      async (menuCtx) => {
        await conversation.external((outsideCtx) => {
          const sessionDraft = outsideCtx.session.advancedMatchDraft ?? { only_topics: false };
          sessionDraft.only_topics = !sessionDraft.only_topics;
          outsideCtx.session.advancedMatchDraft = sessionDraft;
        });
        await editDraftMessage(conversation, menuCtx);
      },
    )
    .row()
    .text('💾 Save', async (menuCtx) => {
      if (await saveDraft(conversation, menuCtx)) {
        await conversation.halt();
      }
    })
    .text('↩ Go Back', async (menuCtx) => {
      await backToList(conversation, menuCtx);
      await conversation.halt();
    });

  if (ctx.callbackQuery) await ctx.deleteMessage().catch(() => {});
  await ctx.replyWithRichMessage({ html: formatDraft(draft) }, { reply_markup: menu });

  while (true) {
    const nextCtx = await conversation.wait();

    if (nextCtx.message?.text === CMD_MENU) {
      await clearDraftSession(conversation);
      await nextCtx.msg?.delete().catch(() => {});
      await replyHtmlMenuFromConversation(conversation, nextCtx, mainMenuHtml, mainMenu);
      await conversation.halt();
    }

    if (!nextCtx.callbackQuery?.data?.startsWith(MENU_PREFIX)) {
      await conversation.skip();
    }
  }
}

export default addAdvancedMatchConversation;
