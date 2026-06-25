import 'dotenv/config';

import type Merit from '##/modules/merits/infra/typeorm/entities/Merit';
import type ModLog from '##/modules/modlog/infra/typeorm/entities/ModLog';
import type Post from '##/modules/posts/infra/typeorm/entities/Post';
import type Topic from '##/modules/posts/infra/typeorm/entities/Topic';
import type TrackedBoard from '##/modules/posts/infra/typeorm/entities/TrackedBoard';

import { ADMIN_TELEGRAM_ID } from '##/config/admin';
import {
  buildAutoTrackTopicNotificationMessage,
  buildMentionNotificationMessage,
  buildMeritNotificationMessage,
  buildRemovedTopicNotificationMessage,
  buildTrackedBoardNotificationMessage,
  buildTrackedPhraseNotificationMessage,
  buildTrackedTopicNotificationMessage,
  buildTrackedUserNotificationMessage,
} from '##/shared/infra/telegram/messages/notificationMessages';
import { Api } from 'grammy';

type SendRichMessageOptions = NonNullable<Parameters<Api['sendRichMessage']>[2]>;

interface PreviewMessage {
  html: string;
  options?: SendRichMessageOptions;
}

const previewPost = {
  post_id: 65234567,
  topic_id: 5248878,
  title: 'Bitcoin is a peer-to-peer electronic cash system',
  author: 'satoshi',
  content: '',
} as unknown as Post;

const previewContent = [
  'Welcome to the new Bitcoin forum!',
  'The old forum can still be reached here:',
  'http://bitcoin.sourceforge.net/boards/index.php',
].join(' ');

const previewTrackedBoard = {
  board: {
    board_id: 39,
    name: 'Bitcoin Discussion & Testing',
  },
} as unknown as TrackedBoard;

const previewMerit = {
  id: 1001,
  post_id: previewPost.post_id,
  topic_id: previewPost.topic_id,
  amount: 2,
  sender: 'satoshi',
  receiver_uid: 42,
  post: previewPost,
} as unknown as Merit;

const previewModLog = {
  topic_id: previewPost.topic_id,
  title: 'Altcoins are a scam',
} as unknown as ModLog;

const previewTopic = {
  topic_id: previewPost.topic_id,
  post_id: previewPost.post_id,
  post: previewPost,
} as unknown as Topic;

const messages: PreviewMessage[] = [
  {
    html: buildMentionNotificationMessage(
      previewPost,
      previewContent,
      180,
      String(ADMIN_TELEGRAM_ID),
    ),
  },
  {
    html: buildTrackedTopicNotificationMessage(
      previewPost,
      previewContent,
      180,
      String(ADMIN_TELEGRAM_ID),
    ),
  },
  {
    html: buildTrackedBoardNotificationMessage(
      previewPost,
      previewTrackedBoard,
      previewContent,
      180,
      String(ADMIN_TELEGRAM_ID),
    ),
  },
  {
    html: buildTrackedUserNotificationMessage(
      previewPost,
      previewContent,
      180,
      String(ADMIN_TELEGRAM_ID),
    ),
  },
  {
    html: buildTrackedPhraseNotificationMessage(
      previewPost,
      'rich HTML & alerts',
      previewContent,
      180,
      String(ADMIN_TELEGRAM_ID),
    ),
  },
  {
    html: buildMeritNotificationMessage(String(ADMIN_TELEGRAM_ID), previewMerit, 1234, null),
  },
  {
    html: buildRemovedTopicNotificationMessage(
      [previewPost, { ...previewPost, post_id: previewPost.post_id + 1 } as unknown as Post],
      previewModLog,
      String(ADMIN_TELEGRAM_ID),
    ),
  },
  {
    html: buildAutoTrackTopicNotificationMessage(previewTopic),
    options: {
      reply_markup: {
        inline_keyboard: [[{ text: 'Yes, add to tracked topics', callback_data: 'add-tt' }]],
      },
    },
  },
];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendRichMessage({ html, options = {} }: PreviewMessage): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }

  const api = new Api(token);
  await api.sendRichMessage(ADMIN_TELEGRAM_ID, { html }, options);
}

async function main(): Promise<void> {
  for (const [index, message] of messages.entries()) {
    await sendRichMessage(message);
    console.log(`Sent preview ${index + 1}/${messages.length}`);
    await wait(500);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
