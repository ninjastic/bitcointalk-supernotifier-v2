import { container, injectable, inject } from 'tsyringe';
import pluralize from 'pluralize';
import escape from 'escape-html';

import logger from '##/shared/services/logger';
import TelegramBot from '##/shared/infra/telegram/bot';

import ICacheProvider from '##/shared/container/providers/models/ICacheProvider';
import Merit from '##/modules/merits/infra/typeorm/entities/Merit';

import { checkBotNotificationError, isAprilFools } from '##/shared/services/utils';
import forumScraperQueue, { queueEvents } from '##/shared/infra/bull/queues/forumScraperQueue';
import SetMeritNotifiedService from '##/modules/merits/services/SetMeritNotifiedService';
import { MeritNotification, NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationService } from '##/modules/posts/services/notification-service';
import getSponsorPhrase from '##/shared/infra/telegram/services/get-sponsor-phrase';
import { sarcasticAprilFoolsMessage } from '##/shared/services/ai';
import { load } from 'cheerio';

type MeritNoficationData = {
  bot: TelegramBot;
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

  private async buildNotificationMessage(merit: Merit, totalMeritCount: number, telegramId: string): Promise<string> {
    const { post_id, topic_id, amount, sender, post } = merit;
    const { title } = post;

    const postUrl = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;
    const sponsor = getSponsorPhrase(telegramId);

    return (
      `${
        totalMeritCount === -1 ? '⭐️ ' : `⭐️ (Merits: <b>${totalMeritCount}</b>) `
      }You received <b>${amount}</b> ${pluralize('merit', amount)} ` +
      `from <b>${escape(sender)}</b> ` +
      `for <a href="${postUrl}">${escape(title)}</a>${sponsor}`
    );
  }

  private async buildNotificationMessageAprilFools(
    merit: Merit,
    totalMeritCount: number,
    telegramId: string
  ): Promise<string> {
    const { post_id, topic_id, amount, sender, post } = merit;
    const { title, content } = post;
    const postUrl = `https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}`;
    const sponsor = getSponsorPhrase(telegramId);

    const $ = load(content);
    const data = $('body');
    data.children('div.quote, div.quoteheader').remove();
    data.find('br').replaceWith('&nbsp;');
    const filteredContent = data.text().replace(/\s\s+/g, ' ').trim();

    const jokeMessage = await sarcasticAprilFoolsMessage(
      `${
        totalMeritCount === -1 ? '⭐️ ' : `⭐️ (Merits: <b>${totalMeritCount}</b>) `
      }You received <b>${amount}</b> ${pluralize('merit', amount)} ` +
        `from <b>${escape(sender)}</b> ` +
        `for <a href="${postUrl}">${escape(title)}</a>\n${filteredContent}`
    );

    return (
      `${
        totalMeritCount === -1 ? '⭐️ ' : `⭐️ (Merits: <b>${totalMeritCount}</b>) `
      }You received <b>${amount}</b> ${pluralize('merit', amount)} ` +
      `from <b>${escape(sender)}</b> ` +
      `for <a href="${postUrl}">${escape(title)}</a>\n\n` +
      `<b>SuperNotifier Ninja-AI:</b> ${jokeMessage}` +
      sponsor
    );
  }

  public async execute({ bot, telegramId, merit }: MeritNoficationData): Promise<boolean> {
    const setMeritNotified = container.resolve(SetMeritNotifiedService);
    let message: string;

    try {
      const { id: merit_id, amount, post_id, receiver_uid } = merit;

      const totalMeritCount = await this.getTotalMeritCount(telegramId, receiver_uid, amount);

      const aprilFools = isAprilFools();

      if (aprilFools) {
        message = await this.buildNotificationMessageAprilFools(merit, totalMeritCount, telegramId);
      } else {
        message = await this.buildNotificationMessage(merit, totalMeritCount, telegramId);
      }

      const messageSent = await bot.instance.api.sendMessage(telegramId, message, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true }
      });

      if (messageSent) {
        logger.info({ telegram_id: telegramId, post_id, message, messageSent }, 'Merit notification was sent');
      } else {
        logger.warn({ telegram_id: telegramId, post_id, message }, 'Could not get Merit notification data');
      }

      await setMeritNotified.execute(merit, telegramId);
      await this.createNotification(telegramId, { post_id, merit_id });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, {
        post_id: merit.post_id,
        id: merit.id,
        message
      });
      return false;
    }
  }
}
