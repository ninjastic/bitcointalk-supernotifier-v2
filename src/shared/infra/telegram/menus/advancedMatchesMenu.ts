import { Menu } from '@grammyjs/menu';
import { container } from 'tsyringe';
import escape from 'escape-html';

import type AdvancedMatch from '../../../../modules/posts/infra/typeorm/entities/AdvancedMatch';
import type { AdvancedMatchDraft } from '../@types/ISession';
import type IMenuContext from '../@types/IMenuContext';

import FindAdvancedMatchesByIdService from '../services/FindAdvancedMatchesByIdService';
import FindAdvancedMatchesByTelegramIdService from '../services/FindAdvancedMatchesByTelegramIdService';
import RemoveAdvancedMatchService from '../services/RemoveAdvancedMatchService';
import { editHtml, editRich, editRichMenu } from './menu-utils';

function label(advancedMatch: AdvancedMatch): string {
  return advancedMatch.name;
}

function buttonLabel(advancedMatch: AdvancedMatch): string {
  const text = label(advancedMatch) ?? '???';
  return text.length > 35 ? `${text.slice(0, 35)}...` : text;
}

function listItems<T>(items: T[] | undefined | null, render: (item: T) => string): string {
  if (!items?.length) return '<i>any</i>';
  return items.map(render).join(', ');
}

function authorListHtml(authors: AdvancedMatch['authors']): string {
  return listItems(authors, (a) => `<code>${escape(a.author)}</code>`);
}

function boardListHtml(boards: AdvancedMatch['boards']): string {
  return listItems(boards, (b) =>
    b.board?.name
      ? `<code>${escape(b.board.name)}</code> (<code>${b.board_id}</code>)`
      : `<code>${b.board_id}</code>`,
  );
}

function topicListHtml(topics: AdvancedMatch['topics']): string {
  return listItems(topics, (t) =>
    t.topic?.post?.title
      ? `${escape(t.topic.post.title)} (<code>${t.topic_id}</code>)`
      : `<code>${t.topic_id}</code>`,
  );
}

function draftAuthorListHtml(draft: AdvancedMatchDraft | undefined | null): string {
  return listItems(draft?.authors, (a) => `<code>${escape(a.author)}</code>`);
}

function draftBoardListHtml(draft: AdvancedMatchDraft | undefined | null): string {
  return listItems(draft?.boards, (b) =>
    b.name
      ? `<code>${escape(b.name)}</code> (<code>${b.board_id}</code>)`
      : `<code>${b.board_id}</code>`,
  );
}

function draftTopicListHtml(draft: AdvancedMatchDraft | undefined | null): string {
  return listItems(draft?.topics, (t) =>
    t.title ? `${escape(t.title)} (<code>${t.topic_id}</code>)` : `<code>${t.topic_id}</code>`,
  );
}

function formatAdvancedMatch(advancedMatch: AdvancedMatch): string {
  return [
    '<h3><b>Advanced Match</b></h3>',
    '',
    '<table>',
    '<tr><th colspan="2">⚙️ Rule</th></tr>',
    `<tr><td><b>Name</b></td><td>${advancedMatch.name ? `<code>${escape(advancedMatch.name)}</code>` : '—'}</td></tr>`,
    `<tr><td><b>Only new topics?</b></td><td>${advancedMatch.only_topics ? '✅ Yes' : '❌ No'}</td></tr>`,
    '<tr><th colspan="2">🔍 Regex filters</th></tr>',
    `<tr><td><b>Title</b></td><td>${advancedMatch.title_regex ? `<pre><code>${escape(advancedMatch.title_regex)}</code></pre>` : '<i>any</i>'}</td></tr>`,
    `<tr><td><b>Content</b></td><td>${advancedMatch.content_regex ? `<pre><code>${escape(advancedMatch.content_regex)}</code></pre>` : '<i>any</i>'}</td></tr>`,
    '<tr><th colspan="2">🎯 Exact filters</th></tr>',
    `<tr><td><b>Authors</b></td><td>${authorListHtml(advancedMatch.authors)}</td></tr>`,
    `<tr><td><b>Boards</b></td><td>${boardListHtml(advancedMatch.boards)}</td></tr>`,
    `<tr><td><b>Topics</b></td><td>${topicListHtml(advancedMatch.topics)}</td></tr>`,
    '</table>',
  ].join('\n');
}

export function formatDraft(draft: IMenuContext['session']['advancedMatchDraft']): string {
  const hasFilter = Boolean(
    draft?.title_regex ||
    draft?.content_regex ||
    draft?.authors?.length ||
    draft?.boards?.length ||
    draft?.topics?.length,
  );

  return [
    '<h3><b>Advanced Match Rule</b></h3>',
    '',
    '<table>',
    '<tr><th colspan="2">⚙️ Rule</th></tr>',
    `<tr><td><b>Name</b></td><td>${draft?.name ? `<code>${escape(draft?.name)}</code>` : '—'}</td></tr>`,
    `<tr><td><b>Only new topics?</b></td><td>${draft?.only_topics ? '✅ Yes' : '❌ No'}</td></tr>`,
    '<tr><th colspan="2">🔍 Regex filters</th></tr>',
    `<tr><td><b>Title</b></td><td>${draft?.title_regex ? `<pre><code>${escape(draft?.title_regex)}</code></pre>` : '<i>any</i>'}</td></tr>`,
    `<tr><td><b>Content</b></td><td>${draft?.content_regex ? `<pre><code>${escape(draft?.content_regex)}</code></pre>` : '<i>any</i>'}</td></tr>`,
    '<tr><th colspan="2">🎯 Exact filters</th></tr>',
    `<tr><td><b>Authors</b></td><td>${draftAuthorListHtml(draft)}</td></tr>`,
    `<tr><td><b>Boards</b></td><td>${draftBoardListHtml(draft)}</td></tr>`,
    `<tr><td><b>Topics</b></td><td>${draftTopicListHtml(draft)}</td></tr>`,
    '</table>',
    '',
    `<footer>${hasFilter ? 'Review the rule and save when ready.' : 'Configure at least one filter, then save the rule.'}</footer>`,
  ].join('\n');
}

async function getAdvancedMatchById(id: string) {
  const findAdvancedMatchesById = container.resolve(FindAdvancedMatchesByIdService);
  return findAdvancedMatchesById.execute(id);
}

const LIST_PAGE_SIZE = 10;
export const LIST_HTML =
  '<h3><b>Advanced Matches</b></h3>\n\nAdd or remove regex-based notification rules.';

async function editMessageWithMenu(ctx: IMenuContext, html: string, menu: Menu<IMenuContext>) {
  await editRichMenu(ctx, html, menu);
}

async function showList(ctx: IMenuContext) {
  await editMessageWithMenu(ctx, LIST_HTML, advancedMatchListMenu);
}

export const advancedMatchListMenu = new Menu<IMenuContext>('aml')
  .dynamic(async (ctx, range) => {
    const findMatches = container.resolve(FindAdvancedMatchesByTelegramIdService);
    const matches = await findMatches.execute(String(ctx.chat.id));

    const page = ctx.session.advancedMatchListPage ?? 0;
    const totalPages = Math.max(1, Math.ceil(matches.length / LIST_PAGE_SIZE));
    const pageMatches = matches.slice(page * LIST_PAGE_SIZE, (page + 1) * LIST_PAGE_SIZE);

    pageMatches.forEach((match) => {
      range
        .submenu({ text: buttonLabel(match), payload: match.id }, 'ami', async (menuCtx) => {
          menuCtx.session.advancedMatchListPage = 0;
          menuCtx.session.advancedMatchCurrentMatchId = menuCtx.match;
          const advancedMatch = await getAdvancedMatchById(menuCtx.match);
          const html = formatAdvancedMatch(advancedMatch);
          await editRich(menuCtx, html);
        })
        .row();
    });

    if (totalPages > 1) {
      range.row();
      if (page > 0) {
        range.text('◀️ Prev', async (menuCtx) => {
          menuCtx.session.advancedMatchListPage = page - 1;
          await menuCtx.menu.update();
        });
      }
      range.text(`${page + 1}/${totalPages}`, async (menuCtx) => {
        await menuCtx.answerCallbackQuery(`Page ${page + 1} of ${totalPages}`);
      });
      if (page < totalPages - 1) {
        range.text('Next ▶️', async (menuCtx) => {
          menuCtx.session.advancedMatchListPage = page + 1;
          await menuCtx.menu.update();
        });
      }
    }
  })
  .row()
  .text('✨ Add new', async (ctx) => {
    ctx.session.advancedMatchDraft = { only_topics: false };
    ctx.session.advancedMatchDraftField = null;
    await ctx.conversation.exit('addAdvancedMatch');
    await ctx.conversation.enter('addAdvancedMatch', { overwrite: true });
  })
  .back('↩ Go Back', async (ctx) => {
    ctx.session.advancedMatchListPage = 0;
    ctx.session.advancedMatchCurrentMatchId = null;
    ctx.session.advancedMatchDraft = null;
    ctx.session.advancedMatchDraftField = null;
    await editHtml(ctx, '<b>Notify me about...</b>\n\nChoose what should trigger notifications.');
  });

export const advancedMatchInfoMenu = new Menu<IMenuContext>('ami')
  .text('✏️ Edit', async (ctx) => {
    const matchId = ctx.session.advancedMatchCurrentMatchId;
    if (!matchId) {
      await showList(ctx);
      return;
    }

    const advancedMatch = await getAdvancedMatchById(matchId);

    ctx.session.advancedMatchDraft = {
      id: advancedMatch.id,
      name: advancedMatch.name,
      title_regex: advancedMatch.title_regex,
      content_regex: advancedMatch.content_regex,
      authors: advancedMatch.authors?.map((a) => ({ author: a.author })) || [],
      boards:
        advancedMatch.boards?.map((b) => ({ board_id: b.board_id, name: b.board?.name ?? null })) ||
        [],
      topics:
        advancedMatch.topics?.map((t) => ({
          topic_id: t.topic_id,
          title: t.topic?.post?.title ?? null,
        })) || [],
      only_topics: advancedMatch.only_topics,
    };
    ctx.session.advancedMatchDraftField = null;
    await ctx.conversation.exit('addAdvancedMatch');
    await ctx.conversation.enter('addAdvancedMatch', { overwrite: true });
  })
  .row()
  .submenu('🗑️ Remove', 'amr', async (ctx) => {
    const matchId = ctx.session.advancedMatchCurrentMatchId;
    if (!matchId) {
      await showList(ctx);
      return;
    }

    const advancedMatch = await getAdvancedMatchById(matchId);
    const text = `Are you sure you want to remove the advanced match: <b>${escape(label(advancedMatch))}</b>?`;
    await editHtml(ctx, text);
  })
  .back('↩ Go Back', async (ctx) => {
    ctx.session.advancedMatchListPage = 0;
    ctx.session.advancedMatchCurrentMatchId = null;
    await editRich(ctx, LIST_HTML);
  });

export const confirmRemoveAdvancedMatchMenu = new Menu<IMenuContext>('amr')
  .text('Yes, do it!', async (ctx) => {
    const matchId = ctx.session.advancedMatchCurrentMatchId;
    if (!matchId) {
      await showList(ctx);
      return;
    }

    const removeAdvancedMatch = container.resolve(RemoveAdvancedMatchService);
    await removeAdvancedMatch.execute(matchId, String(ctx.chat.id));

    ctx.session.advancedMatchCurrentMatchId = null;
    ctx.session.advancedMatchListPage = 0;
    await showList(ctx);
  })
  .row()
  .back('No, go back!', async (ctx) => {
    const matchId = ctx.session.advancedMatchCurrentMatchId;
    if (!matchId) {
      await showList(ctx);
      return;
    }

    const advancedMatch = await getAdvancedMatchById(matchId);
    const html = formatAdvancedMatch(advancedMatch);
    await editRich(ctx, html);
  });

advancedMatchListMenu.register(advancedMatchInfoMenu);
advancedMatchInfoMenu.register(confirmRemoveAdvancedMatchMenu);
