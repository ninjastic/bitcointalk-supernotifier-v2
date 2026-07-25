import type Merit from '##/modules/merits/infra/typeorm/entities/Merit';
import type { MeritNotification } from '##/modules/notifications/infra/typeorm/entities/Notification';
import type ICacheProvider from '##/platform/cache/providers/models/ICacheProvider';
import type TelegramBot from '##/apps/telegram/bot';

import SetMeritNotifiedService from '##/modules/merits/services/SetMeritNotifiedService';
import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationRepository } from '##/modules/notifications/infra/typeorm/repositories/notification-repository';
import forumScraperQueue, { queueEvents } from '##/platform/queues/forumScraperQueue';
import { buildMeritNotificationMessage } from '##/apps/telegram/messages/notificationMessages';
import sendRichTelegramMessage from '##/apps/telegram/services/send-rich-telegram-message';
import logger from '##/platform/logging/logger';
import { checkBotNotificationError } from '##/shared/services/utils';
import { inject, injectable } from 'tsyringe';

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

    @inject(NotificationRepository)
    private readonly notificationRepository: NotificationRepository,

    @inject(SetMeritNotifiedService)
    private readonly setMeritNotified: SetMeritNotifiedService,
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

  public async execute({
    bot,
    telegramId,
    merit,
    scrapedPostTitle,
  }: MeritNoficationData): Promise<boolean> {
    let message: string = '';

    try {
      const { id: merit_id, amount, post_id, receiver_uid } = merit;

      const totalMeritCount = await this.getTotalMeritCount(telegramId, receiver_uid, amount);

      message = buildMeritNotificationMessage(telegramId, merit, totalMeritCount, scrapedPostTitle);

      await sendRichTelegramMessage(bot, telegramId, message);

      logger.info({ telegram_id: telegramId, post_id, message }, 'Merit notification was sent');
      await this.setMeritNotified.execute(merit, telegramId);
      await this.notificationRepository.createNotification<MeritNotification>({
        type: NotificationType.MERIT,
        telegram_id: telegramId,
        metadata: { post_id, merit_id },
      });

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
