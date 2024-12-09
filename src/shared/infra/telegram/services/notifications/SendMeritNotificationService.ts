import { container, injectable, inject } from 'tsyringe';
import pluralize from 'pluralize';
import escape from 'escape-html';

import { sponsorText } from 'config/sponsor';
import logger from '../../../../services/logger';

import bot from '../../index';

import ICacheProvider from '../../../../container/providers/models/ICacheProvider';
import Merit from '../../../../../modules/merits/infra/typeorm/entities/Merit';

import { checkBotNotificationError } from '../../../../services/utils';
import forumScraperQueue, { queueEvents } from '../../../bull/queues/forumScraperQueue';
import SetMeritNotifiedService from '../../../../../modules/merits/services/SetMeritNotifiedService';
import GetPostService from '../../../../../modules/posts/services/GetPostService';

@injectable()
export default class SendMeritNotificationService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute(telegram_id: string, merit: Merit): Promise<boolean> {
    const setMeritNotified = container.resolve(SetMeritNotifiedService);
    const getPost = container.resolve(GetPostService);

    const post = await getPost.execute({
      post_id: merit.post_id,
      topic_id: merit.topic_id
    });

    const { title } = post;
    const { amount, sender, topic_id, post_id, receiver_uid } = merit;

    let totalMeritCount = await this.cacheRepository.recover<number | null>(`meritCount:${telegram_id}`);

    const scraperWorkers = await forumScraperQueue.getWorkers();

    if (totalMeritCount) {
      totalMeritCount += amount;
      await this.cacheRepository.save(`meritCount:${telegram_id}`, totalMeritCount);
    } else if (scraperWorkers.length > 0) {
      const job = await forumScraperQueue.add('scrapeUserMeritCount', { uid: receiver_uid }, { delay: 5000 });
      totalMeritCount = await job.waitUntilFinished(queueEvents, 1000 * 60 * 2);
      await this.cacheRepository.save(`meritCount:${telegram_id}`, totalMeritCount);
    } else {
      totalMeritCount = -1;
    }

    const postUrl = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;

    let message = '';
    message += totalMeritCount === -1 ? '⭐️ ' : `⭐️ (Merits: <b>${totalMeritCount}</b>) `;
    message += `You received <b>${amount}</b> ${pluralize('merit', amount)} `;
    message += `from <b>${escape(sender)}</b> `;
    message += `for <a href="${postUrl}">`;
    message += `${escape(title)}`;
    message += `</a>`;
    message += sponsorText;

    return bot.instance.api
      .sendMessage(telegram_id, message, { parse_mode: 'HTML' })
      .then(async () => {
        logger.info({ telegram_id, post_id, message }, 'Merit notification was sent');
        await setMeritNotified.execute(merit, telegram_id);
        return true;
      })
      .catch(async error => {
        await checkBotNotificationError(error, telegram_id, { post_id, id: merit.id, message });
        return false;
      });
  }
}
