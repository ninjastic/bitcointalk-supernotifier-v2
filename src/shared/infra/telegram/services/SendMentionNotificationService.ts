import { container } from 'tsyringe';
import cheerio from 'cheerio';
import escape from 'escape-html';

import logger from '../../../services/logger';
import bot from '../index';

import Post from '../../../../modules/posts/infra/typeorm/entities/Post';

import { checkBotNotificationError } from '../../../services/utils';
import SetPostNotifiedService from '../../../../modules/posts/services/SetPostNotifiedService';
import SetPostHistoryNotifiedService from '../../../../modules/posts/services/SetPostHistoryNotifiedService';
import RedisProvider from '../../../container/providers/implementations/RedisProvider';

export default class SendMentionNotificationService {
  public async execute(telegram_id: string, post: Post, history?: boolean): Promise<void> {
    const setPostNotified = container.resolve(SetPostNotifiedService);
    const setPostHistoryNotified = container.resolve(SetPostHistoryNotifiedService);
    const postLength = (await container.resolve(RedisProvider).recover<number>(`${telegram_id}:postLength`)) ?? 150;

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
    message += `💬 You have been mentioned by <b>${escape(author)}</b> `;
    message += `in <a href="${postUrl}">`;
    message += `${escape(titleWithBoards)}`;
    message += `</a>\n`;
    message += `<pre>`;
    message += `${escape(contentFiltered.substring(0, postLength))}`;
    message += `${contentFiltered.length > postLength ? '...' : ''}`;
    message += `</pre>`;

    await bot.instance.api
      .sendMessage(telegram_id, message, { parse_mode: 'HTML' })
      .then(async () => {
        logger.info({ telegram_id, post_id, history, message }, 'Mention notification was sent');

        if (history) {
          await setPostHistoryNotified.execute(post.post_id, telegram_id);
        } else {
          await setPostNotified.execute(post.post_id, telegram_id);
        }
      })
      .catch(async error => checkBotNotificationError(error, telegram_id, { post_id, message, history }));
  }
}
