import { container } from 'tsyringe';
import cheerio from 'cheerio';
import escape from 'escape-html';

import logger from '../../../services/logger';
import bot from '../index';

import Post from '../../../../modules/posts/infra/typeorm/entities/Post';

import SetPostNotifiedService from '../../../../modules/posts/services/SetPostNotifiedService';
import SetPostHistoryNotifiedService from '../../../../modules/posts/services/SetPostHistoryNotifiedService';
import SetUserBlockedService from './SetUserBlockedService';

export default class SendMentionNotificationService {
  public async execute(telegram_id: string, post: Post, history?: boolean): Promise<void> {
    const setPostNotified = container.resolve(SetPostNotifiedService);
    const setPostHistoryNotified = container.resolve(SetPostHistoryNotifiedService);

    const setUserBlocked = container.resolve(SetUserBlockedService);

    const { post_id, topic_id, title, author, boards, content } = post;

    const $ = cheerio.load(content);
    const data = $('body');
    data.children('div.quote').remove();
    data.children('div.quoteheader').remove();
    data.find('br').replaceWith('&nbsp;');
    const contentFiltered = data.text().replace(/\s\s+/g, ' ').trim();

    const titleWithBoards = boards.length ? `${boards[boards.length - 1]} / ${title}` : title;
    const postUrl = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;

    let message = '';
    message += `You have been mentioned by <b>${escape(author)}</b> `;
    message += `in <a href="${postUrl}">`;
    message += `${escape(titleWithBoards)}`;
    message += `</a>\n`;
    message += `<pre>`;
    message += `${escape(contentFiltered.substring(0, 150))}`;
    message += `${contentFiltered.length > 150 ? '...' : ''}`;
    message += `</pre>`;

    await bot.instance.api
      .sendMessage(telegram_id, message, { parse_mode: 'HTML' })
      .then(async () => {
        logger.info({ telegram_id, message }, 'Mention notification was sent');

        if (history) {
          await setPostHistoryNotified.execute(post.post_id, telegram_id);
        } else {
          await setPostNotified.execute(post.post_id, telegram_id);
        }
      })
      .catch(async error => {
        if (!error.response) {
          logger.error(
            { error: error.message, telegram_id, post: post.id, message },
            'Error while sending Mention Notification telegram message'
          );

          return;
        }
        if (
          error.response.description === 'Forbidden: bot was blocked by the user' ||
          error.response.description === 'Forbidden: user is deactivated'
        ) {
          logger.info(
            { error: error.response, telegram_id, post: post.id, message },
            'Telegram user marked as blocked'
          );
          await setUserBlocked.execute(telegram_id);
        } else {
          logger.error(
            { error: error.response, telegram_id, post: post.id, message },
            'Error while sending Mention Notification telegram message'
          );
        }
      });
  }
}
