import { container } from 'tsyringe';
import cheerio from 'cheerio';
import escape from 'escape-html';
import logger from '../../../services/logger';

import Post from '../../../../modules/posts/infra/typeorm/entities/Post';

import bot from '../index';

import SetPostNotifiedService from '../../../../modules/posts/services/SetPostNotifiedService';
import SetUserBlockedService from './SetUserBlockedService';

export default class SendTopicTrackingNotificationService {
  public async execute(telegram_id: string, post: Post): Promise<void> {
    const setPostNotified = container.resolve(SetPostNotifiedService);
    const setUserBlocked = container.resolve(SetUserBlockedService);

    const { post_id, topic_id, title, author, boards, content } = post;

    const $ = cheerio.load(content);
    const data = $('body');
    data.children('div.quote').remove();
    data.children('div.quoteheader').remove();
    data.find('br').replaceWith('&nbsp;');
    const contentFiltered = data.text().replace(/\s\s+/g, ' ').trim();

    const titleWithBoards = boards.length ? `${boards[boards.length - 1]} / ${title}` : title;

    let message = '';
    message += `There is a new reply by <b>${escape(author)}</b> `;
    message += `in the tracked topic <a href="https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}">`;
    message += `${escape(titleWithBoards)}`;
    message += `</a>\n`;
    message += `<pre>`;
    message += `${escape(contentFiltered.substring(0, 150))}`;
    message += `${contentFiltered.length > 150 ? '...' : ''}`;
    message += `</pre>`;

    await bot.instance.api
      .sendMessage(telegram_id, message, { parse_mode: 'HTML' })
      .then(async () => {
        logger.info({ telegram_id, message }, 'Topic Tracking notification was sent');
        await setPostNotified.execute(post.post_id, telegram_id);
      })
      .catch(async error => {
        if (!error.response) {
          logger.error(
            { error: error.message, telegram_id, post: post.id, message },
            'Error while sending Topic Tracking Notification telegram message'
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
            'Error while sending Tracked Topic Notification telegram message'
          );
        }
      });
  }
}
