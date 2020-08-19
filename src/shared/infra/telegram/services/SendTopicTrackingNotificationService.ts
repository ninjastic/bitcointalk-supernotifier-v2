import { container } from 'tsyringe';
import cheerio from 'cheerio';
import logger from '../../../services/logger';

import Post from '../../../../modules/posts/infra/typeorm/entities/Post';

import bot from '../index';

import SetPostNotifiedService from '../../../../modules/posts/services/SetPostNotifiedService';
import SetUserBlockedService from './SetUserBlockedService';

export default class SendTopicTrackingNotificationService {
  public async execute(telegram_id: number, post: Post): Promise<void> {
    const setPostNotified = container.resolve(SetPostNotifiedService);
    const setUserBlocked = container.resolve(SetUserBlockedService);

    const $ = cheerio.load(post.content);
    const data = $('body');
    data.children('div.quote').remove();
    data.children('div.quoteheader').remove();
    data.find('br').replaceWith('&nbsp;');
    const contentFiltered = data.text().replace(/\s\s+/g, ' ').trim();

    let message = '';
    message += `There is a new reply by <b>${post.author}</b> `;
    message += `in the tracked topic <a href="https://bitcointalk.org/index.php?topic=${post.topic_id}.msg${post.post_id}#msg${post.post_id}">${post.title}</a>\n`;
    message += `<pre>`;
    message += `${contentFiltered.substring(0, 150)}`;
    message += `${contentFiltered.length > 150 ? '...' : ''}`;
    message += `</pre>`;

    await bot.instance.telegram
      .sendMessage(telegram_id, message, { parse_mode: 'HTML' })
      .then(async () => {
        await setPostNotified.execute(post.post_id, telegram_id);
      })
      .catch(async error => {
        if (!error.response) {
          logger.error(
            { error: error.response },
            'Error while sending Topic Tracking Notification telegram message',
          );

          return;
        }
        if (
          error.response.description ===
          'Forbidden: bot was blocked by the user'
        ) {
          logger.info(
            { error: error.response, telegram_id, post: post.id },
            'Telegram user marked as blocked',
          );
          await setUserBlocked.execute(telegram_id);
        }
      });
  }
}
