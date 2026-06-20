import type Merit from '##/modules/merits/infra/typeorm/entities/Merit';
import type { MeritNotification } from '##/modules/notifications/infra/typeorm/entities/Notification';
import type ICacheProvider from '##/shared/container/providers/models/ICacheProvider';
import type TelegramBot from '##/shared/infra/telegram/bot';

import SetMeritNotifiedService from '##/modules/merits/services/SetMeritNotifiedService';
import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationService } from '##/modules/posts/services/notification-service';
import forumScraperQueue, { queueEvents } from '##/shared/infra/bull/queues/forumScraperQueue';
import { buildMeritNotificationMessage } from '##/shared/infra/telegram/messages/notificationMessages';
import sendRichTelegramMessage from '##/shared/infra/telegram/services/send-rich-telegram-message';
import logger from '##/shared/services/logger';
import { checkBotNotificationError } from '##/shared/services/utils';
import { container, inject, injectable } from 'tsyringe';

interface MeritNoficationData {
  bot: TelegramBot;
  telegramId: string;
  merit: Merit;
  scrapedPostTitle: string | null;
}

@injectable()
export default class SendMeritNotificationService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  private async getTotalMeritCount(
    telegram_id: string,
    receiver_uid: number,
    amount: number,
  ): Promise<number> {
    let totalMeritCount = await this.cacheRepository.recover<number | null>(
      `meritCount:${telegram_id}`,
    );

    if (totalMeritCount !== null) {
      totalMeritCount += amount;
      await this.cacheRepository.save(`meritCount:${telegram_id}`, totalMeritCount);
      return totalMeritCount;
    }

    const scraperWorkers = await forumScraperQueue.getWorkers();
    if (scraperWorkers.length > 0) {
      const job = await forumScraperQueue.add(
        'scrapeUserMeritCount',
        { uid: receiver_uid },
        { delay: 5000 },
      );
      totalMeritCount = await job.waitUntilFinished(queueEvents, 1000 * 60 * 2);
      await this.cacheRepository.save(`meritCount:${telegram_id}`, totalMeritCount);
      return totalMeritCount;
    }

    return -1;
  }

  private async createNotification(
    telegram_id: string,
    metadata: MeritNotification['metadata'],
  ): Promise<void> {
    const notificationService = new NotificationService();
    await notificationService.createNotification<MeritNotification>({
      type: NotificationType.MERIT,
      telegram_id,
      metadata,
    });
  }

  private async buildNotificationMessage(
    telegramId: string,
    merit: Merit,
    totalMeritCount: number,
    scrapedPostTitle: string | null,
  ): Promise<string> {
    return buildMeritNotificationMessage(telegramId, merit, totalMeritCount, scrapedPostTitle);
  }

  public async execute({
    bot,
    telegramId,
    merit,
    scrapedPostTitle,
  }: MeritNoficationData): Promise<boolean> {
    const setMeritNotified = container.resolve(SetMeritNotifiedService);
    let message: string;

    try {
      const { id: merit_id, amount, post_id, receiver_uid } = merit;

      const totalMeritCount = await this.getTotalMeritCount(telegramId, receiver_uid, amount);

      message = await this.buildNotificationMessage(
        telegramId,
        merit,
        totalMeritCount,
        scrapedPostTitle,
      );

      await sendRichTelegramMessage(bot, telegramId, message);

      logger.info({ telegram_id: telegramId, post_id, message }, 'Merit notification was sent');
      await setMeritNotified.execute(merit, telegramId);
      await this.createNotification(telegramId, { post_id, merit_id });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, {
        post_id: merit.post_id,
        id: merit.id,
        message,
      });
      return false;
    }
  }
}
