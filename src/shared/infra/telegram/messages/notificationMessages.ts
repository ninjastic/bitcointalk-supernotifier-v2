import type Merit from '##/modules/merits/infra/typeorm/entities/Merit';
import type ModLog from '##/modules/modlog/infra/typeorm/entities/ModLog';
import type AdvancedMatch from '##/modules/posts/infra/typeorm/entities/AdvancedMatch';
import type Post from '##/modules/posts/infra/typeorm/entities/Post';
import type Topic from '##/modules/posts/infra/typeorm/entities/Topic';
import type TrackedBoard from '##/modules/posts/infra/typeorm/entities/TrackedBoard';

import getSponsorPhrase from '##/shared/infra/telegram/services/get-sponsor-phrase';
import escape from 'escape-html';
import pluralize from 'pluralize';

function postUrl(post: Pick<Post, 'topic_id' | 'post_id'>): string {
  return `https://bitcointalk.org/index.php?topic=${post.topic_id}.msg${post.post_id}#msg${post.post_id}`;
}

function htmlLink(url: string, text: string): string {
  return `<a href="${escape(url)}">${escape(text)}</a>`;
}

function preview(content: string, postLength: number): string {
  const truncated = content.substring(0, postLength);
  return `${escape(truncated)}${content.length > postLength ? '...' : ''}`;
}

function sponsorFooter(telegramId: string): string {
  return `<footer>${getSponsorPhrase(telegramId).trim()}</footer>`;
}

function authorLine(author: string, url: string, title: string): string {
  return `👤 <b>${escape(author)}</b> · ${htmlLink(url, title)}`;
}

export function buildMentionNotificationMessage(
  post: Post,
  content: string,
  postLength: number,
  telegramId: string,
): string {
  return (
    `<b>💬 Mention</b>` +
    `<blockquote>${authorLine(post.author, postUrl(post), post.title)}<br><br>\n${preview(content, postLength)}</blockquote>` +
    sponsorFooter(telegramId)
  );
}

export function buildTrackedTopicNotificationMessage(
  post: Post,
  content: string,
  postLength: number,
  telegramId: string,
): string {
  return (
    `<b>📄 Tracked topic reply</b>` +
    `<blockquote>${authorLine(post.author, postUrl(post), post.title)}<br><br>\n${preview(content, postLength)}</blockquote>` +
    sponsorFooter(telegramId)
  );
}

export function buildTrackedBoardNotificationMessage(
  post: Post,
  trackedBoard: TrackedBoard,
  content: string,
  postLength: number,
  telegramId: string,
): string {
  return (
    `<b>📝 New board topic</b>` +
    `<p>${escape(trackedBoard.board.name)}</p>` +
    `<blockquote>${authorLine(post.author, postUrl(post), post.title)}<br><br>\n${preview(content, postLength)}</blockquote>` +
    sponsorFooter(telegramId)
  );
}

export function buildTrackedUserNotificationMessage(
  post: Post,
  content: string,
  postLength: number,
  telegramId: string,
): string {
  return (
    `<b>👤 Tracked user post</b>` +
    `<blockquote>${authorLine(post.author, postUrl(post), post.title)}<br><br>\n${preview(content, postLength)}</blockquote>` +
    sponsorFooter(telegramId)
  );
}

export function buildTrackedPhraseNotificationMessage(
  post: Post,
  phrase: string,
  content: string,
  postLength: number,
  telegramId: string,
): string {
  return (
    `<b>🔠 Phrase match</b>` +
    `<p>${escape(phrase)}</p>` +
    `<blockquote>${authorLine(post.author, postUrl(post), post.title)}<br><br>\n${preview(content, postLength)}</blockquote>` +
    sponsorFooter(telegramId)
  );
}

function advancedMatchSummary(advancedMatch: AdvancedMatch): string {
  const authorPart = advancedMatch.authors?.length
    ? `authors: ${advancedMatch.authors.map((a) => a.author).join(', ')}`
    : null;
  const boardPart = advancedMatch.boards?.length
    ? `boards: ${advancedMatch.boards.map((b) => b.board?.name || b.board_id).join(', ')}`
    : null;
  const topicPart = advancedMatch.topics?.length
    ? `topics: ${advancedMatch.topics.map((t) => t.topic_id).join(', ')}`
    : null;

  const parts = [
    advancedMatch.title_regex ? `title: ${advancedMatch.title_regex}` : null,
    advancedMatch.content_regex ? `content: ${advancedMatch.content_regex}` : null,
    authorPart,
    boardPart,
    topicPart,
    advancedMatch.only_topics ? 'new topics only' : null,
  ].filter(Boolean);

  return parts.join(' · ');
}

export function buildAdvancedMatchNotificationMessage(
  post: Post,
  advancedMatch: AdvancedMatch,
  content: string,
  postLength: number,
  telegramId: string,
): string {
  return (
    `<b>🔎 Advanced match</b>` +
    `<p><mark>${escape(advancedMatch.name || advancedMatchSummary(advancedMatch))}</mark></p>` +
    `<blockquote>${authorLine(post.author, postUrl(post), post.title)}<br><br>\n${preview(content, postLength)}</blockquote>` +
    sponsorFooter(telegramId)
  );
}

export function buildMeritNotificationMessage(
  telegramId: string,
  merit: Merit,
  totalMeritCount: number,
  scrapedPostTitle: string | null,
): string {
  const { amount, sender, post } = merit;
  const total = totalMeritCount === -1 ? '' : `  ·  Total: ${totalMeritCount}`;

  return (
    `<b>⭐️ +<b>${amount}</b> from <b>${escape(sender)}</b>${total}</b>` +
    `<p>${htmlLink(postUrl(merit), scrapedPostTitle || post.title)}</p>` +
    sponsorFooter(telegramId)
  );
}

export function buildRemovedTopicNotificationMessage(
  posts: Post[],
  modLog: ModLog,
  telegramId: string,
): string {
  const postCount = posts.length;

  return (
    `<b>🗑 <b>${postCount} ${pluralize('post', postCount)} nuked</b></b>` +
    `<p>Archived: ${htmlLink(`https://ninjastic.space/topic/${modLog.topic_id}`, modLog.title)}</p>` +
    sponsorFooter(telegramId)
  );
}

export function buildAutoTrackTopicNotificationMessage(topic: Topic): string {
  const { title, topic_id, post_id } = topic.post;
  const url = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;

  return (
    `<b>📖 Track your new topic?</b>` +
    `<p>${htmlLink(url, title)}</p>` +
    `<p>Start tracking replies?</p>`
  );
}
