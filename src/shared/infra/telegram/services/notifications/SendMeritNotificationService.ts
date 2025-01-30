import { container, injectable, inject } from 'tsyringe';
import pluralize from 'pluralize';
import escape from 'escape-html';

import { sponsorText } from '@/config/sponsor';
import logger from '@/shared/services/logger';
import bot from '@/shared/infra/telegram';

import ICacheProvider from '@/shared/container/providers/models/ICacheProvider';
import Merit from '@/modules/merits/infra/typeorm/entities/Merit';

import { checkBotNotificationError } from '@/shared/services/utils';
import forumScraperQueue, { queueEvents } from '@/shared/infra/bull/queues/forumScraperQueue';
import SetMeritNotifiedService from '@/modules/merits/services/SetMeritNotifiedService';
import GetPostService from '@/modules/posts/services/GetPostService';
import { MeritNotification, NotificationType } from '@/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationService } from '@/modules/posts/services/notification-service';

type MeritNoficationData = {
  telegramId: string;
  merit: Merit;
};

@injectable()
export default class SendMeritNotificationService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  private async getTotalMeritCount(telegram_id: string, receiver_uid: number, amount: number): Promise<number> {
    let totalMeritCount = await this.cacheRepository.recover<number | null>(`meritCount:${telegram_id}`);

    if (totalMeritCount !== null) {
      totalMeritCount += amount;
      await this.cacheRepository.save(`meritCount:${telegram_id}`, totalMeritCount);
      return totalMeritCount;
    }

    const scraperWorkers = await forumScraperQueue.getWorkers();
    if (scraperWorkers.length > 0) {
      const job = await forumScraperQueue.add('scrapeUserMeritCount', { uid: receiver_uid }, { delay: 5000 });
      totalMeritCount = await job.waitUntilFinished(queueEvents, 1000 * 60 * 2);
      await this.cacheRepository.save(`meritCount:${telegram_id}`, totalMeritCount);
      return totalMeritCount;
    }

    return -1;
  }

  private async createNotification(telegram_id: string, metadata: MeritNotification['metadata']): Promise<void> {
    const notificationService = new NotificationService();
    await notificationService.createNotification<MeritNotification>({
      type: NotificationType.MERIT,
      telegram_id,
      metadata
    });
  }

  private async buildNotificationMessage(
    title: string,
    sender: string,
    amount: number,
    totalMeritCount: number,
    topic_id: number,
    post_id: number
  ): Promise<string> {
    const postUrl = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;

    return (
      `${
        totalMeritCount === -1 ? '⭐️ ' : `⭐️ (Merits: <b>${totalMeritCount}</b>) `
      }You received <b>${amount}</b> ${pluralize('merit', amount)} ` +
      `from <b>${escape(sender)}</b> ` +
      `for <a href="${postUrl}">${escape(title)}</a>${sponsorText}`
    );
  }

  public async execute({ telegramId, merit }: MeritNoficationData): Promise<boolean> {
    const setMeritNotified = container.resolve(SetMeritNotifiedService);
    const getPost = container.resolve(GetPostService);

    try {
      const post = await getPost.execute({
        post_id: merit.post_id,
        topic_id: merit.topic_id
      });

      const { title } = post;
      const { id: merit_id, amount, sender, topic_id, post_id, receiver_uid } = merit;

      const totalMeritCount = await this.getTotalMeritCount(telegramId, receiver_uid, amount);
      const message = await this.buildNotificationMessage(title, sender, amount, totalMeritCount, topic_id, post_id);

      const messageSent = await bot.instance.api.sendMessage(telegramId, message, { parse_mode: 'HTML' });

      if (messageSent) {
        logger.info({ telegram_id: telegramId, post_id, message, messageSent }, 'Merit notification was sent');
      } else {
        logger.warn({ telegram_id: telegramId, post_id, message }, 'Could not get merit notification data');
      }

      await setMeritNotified.execute(merit, telegramId);
      await this.createNotification(telegramId, { post_id, merit_id });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, {
        post_id: merit.post_id,
        id: merit.id,
        message: await this.buildNotificationMessage(
          'Unknown Title',
          merit.sender,
          merit.amount,
          -1,
          merit.topic_id,
          merit.post_id
        )
      });
      return false;
    }
  }
}
