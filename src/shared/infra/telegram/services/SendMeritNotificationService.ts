import { container, injectable, inject } from 'tsyringe';
import pluralize from 'pluralize';
import escape from 'escape-html';
import Queue from 'bull';

import logger from '../../../services/logger';
import cacheConfig from '../../../../config/cache';

import bot from '../index';

import ICacheProvider from '../../../container/providers/models/ICacheProvider';
import Merit from '../../../../modules/merits/infra/typeorm/entities/Merit';

import SetMeritNotifiedService from '../../../../modules/merits/services/SetMeritNotifiedService';
import GetPostService from '../../../../modules/posts/services/GetPostService';
import SetUserBlockedService from './SetUserBlockedService';

@injectable()
export default class SendMeritNotificationService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute(telegram_id: string, merit: Merit): Promise<void> {
    const setMeritNotified = container.resolve(SetMeritNotifiedService);
    const setUserBlocked = container.resolve(SetUserBlockedService);
    const getPost = container.resolve(GetPostService);

    const post = await getPost.execute({
      post_id: merit.post_id,
      topic_id: merit.topic_id
    });

    const { title, boards } = post;
    const { amount, sender, topic_id, post_id, receiver_uid } = merit;

    let totalMeritCount = await this.cacheRepository.recover<number | null>(`meritCount:${telegram_id}`);

    if (totalMeritCount) {
      totalMeritCount += amount;

      await this.cacheRepository.save(`meritCount:${telegram_id}`, totalMeritCount);
    } else {
      const queue = new Queue('ForumScrapperSideQueue', {
        redis: cacheConfig.config.redis,
        defaultJobOptions: { removeOnComplete: true, removeOnFail: true }
      });

      const job = await queue.add(
        'scrapeUserMeritCount',
        {
          uid: receiver_uid
        },
        { delay: 5000 }
      );

      totalMeritCount = await job.finished();

      await queue.close();

      await this.cacheRepository.save(`meritCount:${telegram_id}`, totalMeritCount);
    }

    const titleWithBoards = boards.length ? `${boards[boards.length - 1]} / ${title}` : title;
    const postUrl = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;

    let message = '';
    message += `(Merits: <b>${totalMeritCount}</b>) `;
    message += `You received <b>${amount}</b> ${pluralize('merit', amount)} `;
    message += `from <b>${escape(sender)}</b> `;
    message += `for <a href="${postUrl}">`;
    message += `${escape(titleWithBoards)}`;
    message += `</a>`;

    await bot.instance.api
      .sendMessage(telegram_id, message, { parse_mode: 'HTML' })
      .then(async () => {
        logger.info({ telegram_id, post_id, message }, 'Merit notification was sent');
        await setMeritNotified.execute(merit, telegram_id);
      })
      .catch(async error => {
        const isBotBlocked = ['Forbidden: bot was blocked by the user', 'Forbidden: user is deactivated'].includes(
          error.response?.description
        );
        if (isBotBlocked) {
          logger.info({ telegram_id, post_id, message }, 'Telegram user marked as blocked');
          await setUserBlocked.execute(telegram_id);
        } else {
          logger.error(
            { error: error.response ?? error.message, telegram_id, post_id, merit, message },
            'Error while sending Merit Notification telegram message'
          );
        }
      });
  }
}
