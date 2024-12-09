import { container, inject, injectable } from 'tsyringe';
import cheerio from 'cheerio';
import escape from 'escape-html';

import { sponsorText } from 'config/sponsor';
import logger from '../../../../services/logger';
import bot from '../../index';

import Post from '../../../../../modules/posts/infra/typeorm/entities/Post';
import User from '../../../../../modules/users/infra/typeorm/entities/User';

import { checkBotNotificationError } from '../../../../services/utils';
import SetPostNotifiedService from '../../../../../modules/posts/services/SetPostNotifiedService';
import SetPostHistoryNotifiedService from '../../../../../modules/posts/services/SetPostHistoryNotifiedService';
import ICacheProvider from '../../../../container/providers/models/ICacheProvider';

type Data = {
  post: Post;
  user: User;
  history: boolean;
};

@injectable()
export default class SendMentionNotificationService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute({ post, user, history }: Data): Promise<boolean> {
    const setPostNotified = container.resolve(SetPostNotifiedService);
    const setPostHistoryNotified = container.resolve(SetPostHistoryNotifiedService);
    const postLength = (await this.cacheRepository.recover<number>(`${user.telegram_id}:postLength`)) ?? 150;

    const { post_id, topic_id, title, author, content } = post;

    const $ = cheerio.load(content);
    const html = $('body');
    html.children('div.quote').remove();
    html.children('div.quoteheader').remove();
    html.find('br').replaceWith('&nbsp;');
    const contentFiltered = html.text().replace(/\s\s+/g, ' ').trim();

    const postUrl = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;

    let message = '';
    message += `💬 You have been mentioned by <b>${escape(author)}</b> `;
    message += `in <a href="${postUrl}">`;
    message += `${escape(title)}`;
    message += `</a>\n`;
    message += `<pre>`;
    message += `${escape(contentFiltered.substring(0, postLength))}`;
    message += `${contentFiltered.length > postLength ? '...' : ''}`;
    message += `</pre>`;
    message += sponsorText;

    return bot.instance.api
      .sendMessage(user.telegram_id, message, { parse_mode: 'HTML' })
      .then(async () => {
        logger.info({ telegram_id: user.telegram_id, post_id, history, message }, 'Mention notification was sent');

        if (history) {
          await setPostHistoryNotified.execute(post.post_id, user.telegram_id);
        } else {
          await setPostNotified.execute(post.post_id, user.telegram_id);
        }

        return true;
      })
      .catch(async error => {
        await checkBotNotificationError(error, user.telegram_id, { post_id, message, history });
        return false;
      });
  }
}
