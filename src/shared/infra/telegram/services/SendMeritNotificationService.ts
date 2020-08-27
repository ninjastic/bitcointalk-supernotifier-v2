import { container, injectable, inject } from 'tsyringe';
import pluralize from 'pluralize';
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
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(telegram_id: number, merit: Merit): Promise<void> {
    const setMeritNotified = container.resolve(SetMeritNotifiedService);
    const setUserBlocked = container.resolve(SetUserBlockedService);
    const getPost = container.resolve(GetPostService);

    const post = await getPost.execute(merit.post_id, merit.topic_id);

    const { title } = post;
    const { amount, sender, topic_id, post_id, receiver_uid } = merit;

    let totalMeritCount = await this.cacheRepository.recover<number | null>(
      `meritCount:${telegram_id}`,
    );

    if (totalMeritCount) {
      totalMeritCount += amount;

      await this.cacheRepository.save(
        `meritCount:${telegram_id}`,
        totalMeritCount,
        'EX',
        300,
      );
    } else {
      const queue = new Queue('ForumScrapperSideQueue', {
        redis: cacheConfig.config.redis,
      });

      const job = await queue.add(
        'scrapeUserMeritCount',
        {
          uid: receiver_uid,
        },
        { delay: 10000 },
      );

      totalMeritCount = await job.finished();

      await queue.close();

      await this.cacheRepository.save(
        `meritCount:${telegram_id}`,
        totalMeritCount,
        'EX',
        300,
      );
    }

    let message = '';
    message += `(Merits: <b>${totalMeritCount}</b>) `;
    message += `You received <b>${amount}</b> ${pluralize('merit', amount)} `;
    message += `from <b>${sender}</b> `;
    message += `for <a href="https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}">${title}</a>`;

    await bot.instance.telegram
      .sendMessage(telegram_id, message, { parse_mode: 'HTML' })
      .then(async () => {
        logger.info({ telegram_id, message }, 'Merit notification was sent');
        await setMeritNotified.execute(merit, telegram_id);
      })
      .catch(async error => {
        if (!error.response) {
          logger.error(
            { error: error.response },
            'Error while sending Merit Notification telegram message',
          );

          return;
        }
        if (
          error.response.description ===
          'Forbidden: bot was blocked by the user'
        ) {
          logger.info(
            { error: error.response, telegram_id, merit: merit.id },
            'Telegram user marked as blocked',
          );
          await setUserBlocked.execute(telegram_id);
        }
      });
  }
}
