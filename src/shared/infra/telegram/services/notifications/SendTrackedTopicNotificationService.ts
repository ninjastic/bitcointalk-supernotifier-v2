import { container, inject, injectable } from 'tsyringe';
import cheerio from 'cheerio';
import escape from 'escape-html';

import { sponsorText } from '../../../../../config/sponsor';
import logger from '../../../../services/logger';
import bot from '../../index';

import Post from '../../../../../modules/posts/infra/typeorm/entities/Post';

import SetPostNotifiedService from '../../../../../modules/posts/services/SetPostNotifiedService';
import { checkBotNotificationError } from '../../../../services/utils';
import ICacheProvider from '../../../../container/providers/models/ICacheProvider';

@injectable()
export default class SendTrackedTopicNotificationService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute(telegram_id: string, post: Post): Promise<boolean> {
    const setPostNotified = container.resolve(SetPostNotifiedService);
    const postLength = (await this.cacheRepository.recover<number>(`${telegram_id}:postLength`)) ?? 150;

    const { post_id, topic_id, title, author, boards, content } = post;

    const $ = cheerio.load(content);
    const data = $('body');
    data.children('div.quote').remove();
    data.children('div.quoteheader').remove();
    data.find('br').replaceWith('&nbsp;');
    const contentFiltered = data.text().replace(/\s\s+/g, ' ').trim();

    const titleWithBoards = boards.length ? `${boards[boards.length - 1]} / ${title}` : title;

    let message = '';
    message += `📄 There is a new reply by <b>${escape(author)}</b> `;
    message += `in the tracked topic <a href="https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}">`;
    message += `${escape(titleWithBoards)}`;
    message += `</a>\n`;
    message += `<pre>`;
    message += `${escape(contentFiltered.substring(0, postLength))}`;
    message += `${contentFiltered.length > postLength ? '...' : ''}`;
    message += `</pre>`;
    message += sponsorText;

    return bot.instance.api
      .sendMessage(telegram_id, message, { parse_mode: 'HTML' })
      .then(async () => {
        logger.info({ telegram_id, post_id, message }, 'Tracked Topic notification was sent');
        await setPostNotified.execute(post.post_id, telegram_id);
        return true;
      })
      .catch(async error => {
        await checkBotNotificationError(error, telegram_id, { post_id, message });
        return false;
      });
  }
}
