import type Merit from '##/modules/merits/infra/typeorm/entities/Merit';
import type ModLog from '##/modules/modlog/infra/typeorm/entities/ModLog';
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
  return `<p><b>${escape(author)}</b> · ${htmlLink(url, title)}</p>`;
}

export function buildMentionNotificationMessage(
  post: Post,
  content: string,
  postLength: number,
  telegramId: string,
): string {
  return (
    `<h3>💬 Mention</h3>` +
    authorLine(post.author, postUrl(post), post.title) +
    `<blockquote>${preview(content, postLength)}</blockquote>` +
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
    `<h3>📄 Tracked topic reply</h3>` +
    authorLine(post.author, postUrl(post), post.title) +
    `<blockquote>${preview(content, postLength)}</blockquote>` +
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
    `<h3>📝 New board topic</h3>` +
    `<p><b>Board:</b> ${escape(trackedBoard.board.name)}</p>` +
    authorLine(post.author, postUrl(post), post.title) +
    `<blockquote>${preview(content, postLength)}</blockquote>` +
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
    `<h3>👤 Tracked user post</h3>` +
    authorLine(post.author, postUrl(post), post.title) +
    `<blockquote>${preview(content, postLength)}</blockquote>` +
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
    `<h3>🔠 Phrase match</h3>` +
    `<p><mark>${escape(phrase)}</mark></p>` +
    authorLine(post.author, postUrl(post), post.title) +
    `<blockquote>${preview(content, postLength)}</blockquote>` +
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
    `<h3>⭐️ +<b>${amount}</b> from <b>${escape(sender)}</b>${total}</h3>` +
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
    `<h3>🗑 <b>${postCount} ${pluralize('post', postCount)} nuked</b></h3>` +
    `<p>Archived: ${htmlLink(`https://ninjastic.space/topic/${modLog.topic_id}`, modLog.title)}</p>` +
    sponsorFooter(telegramId)
  );
}

export function buildAutoTrackTopicNotificationMessage(topic: Topic): string {
  const { title, topic_id, post_id } = topic.post;
  const url = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;

  return (
    `<h3>📖 Track your new topic?</h3>` +
    `<p>${htmlLink(url, title)}</p>` +
    `<p>Start tracking replies?</p>`
  );
}
