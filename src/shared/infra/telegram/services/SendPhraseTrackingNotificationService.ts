import { container } from 'tsyringe';
import cheerio from 'cheerio';
import escape from 'escape-html';

import logger from '../../../services/logger';
import Post from '../../../../modules/posts/infra/typeorm/entities/Post';

import bot from '../index';

import SetPostNotifiedService from '../../../../modules/posts/services/SetPostNotifiedService';
import SetUserBlockedService from './SetUserBlockedService';

export default class SendPhraseTrackingNotificationService {
  public async execute(telegram_id: number, post: Post, phrase: string): Promise<void> {
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
    const postUrl = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;

    let message = '';
    message += `New post with matched phrase <b>${phrase}</b> `;
    message += `by <b>${escape(author)}</b> `;
    message += `in the topic <a href="${postUrl}">`;
    message += `${escape(titleWithBoards)}`;
    message += `</a>\n`;
    message += `<pre>`;
    message += `${escape(contentFiltered.substring(0, 150))}`;
    message += `${contentFiltered.length > 150 ? '...' : ''}`;
    message += `</pre>`;

    await bot.instance.api
      .sendMessage(telegram_id, message, { parse_mode: 'HTML' })
      .then(async () => {
        logger.info({ telegram_id, message }, 'Phrase Tracking notification was sent');
        await setPostNotified.execute(post.post_id, telegram_id);
      })
      .catch(async error => {
        if (!error.response) {
          logger.error(
            { error: error.message, telegram_id, post: post.id, message },
            'Error while sending Phrase Tracking Notification telegram message'
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
            'Error while sending Phrase Topic Notification telegram message'
          );
        }
      });
  }
}
