import { container } from 'tsyringe';
import cheerio from 'cheerio';
import escape from 'escape-html';
import logger from '../../../services/logger';

import bot from '../index';

import Post from '../../../../modules/posts/infra/typeorm/entities/Post';
import TrackedBoard from '../../../../modules/posts/infra/typeorm/entities/TrackedBoard';

import { checkBotNotificationError } from '../../../services/utils';
import SetPostNotifiedService from '../../../../modules/posts/services/SetPostNotifiedService';

export default class SendTrackedBoardNotificationService {
  public async execute(telegram_id: string, post: Post, trackedBoard: TrackedBoard): Promise<void> {
    const setPostNotified = container.resolve(SetPostNotifiedService);

    const { post_id, topic_id, title, author, boards, content } = post;
    const { board } = trackedBoard;

    const $ = cheerio.load(content);
    const data = $('body');
    data.children('div.quote').remove();
    data.children('div.quoteheader').remove();
    data.find('br').replaceWith('&nbsp;');
    const contentFiltered = data.text().replace(/\s\s+/g, ' ').trim();

    const titleWithBoards = boards.length ? `${boards[boards.length - 1]} / ${title}` : title;

    let message = '';
    message += `📝 There is a new topic by <b>${escape(author)}</b> `;
    message += `in the tracked board <b>${board.name}</b>: <a href="https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}">`;
    message += `${escape(titleWithBoards)}`;
    message += `</a>\n`;
    message += `<pre>`;
    message += `${escape(contentFiltered.substring(0, 150))}`;
    message += `${contentFiltered.length > 150 ? '...' : ''}`;
    message += `</pre>`;

    await bot.instance.api
      .sendMessage(telegram_id, message, { parse_mode: 'HTML' })
      .then(async () => {
        logger.info({ telegram_id, post_id, message }, 'Tracked Board notification was sent');
        await setPostNotified.execute(post.post_id, telegram_id);
      })
      .catch(async error => checkBotNotificationError(error, telegram_id, { post_id, trackedBoard, message }));
  }
}
