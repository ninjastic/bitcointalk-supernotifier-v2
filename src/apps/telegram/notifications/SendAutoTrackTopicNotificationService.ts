import type { AutoTrackTopicRequestNotification } from '##/modules/notifications/infra/typeorm/entities/Notification';
import type Topic from '##/modules/posts/infra/typeorm/entities/Topic';
import type ICacheProvider from '##/platform/cache/providers/models/ICacheProvider';
import type TelegramBot from '##/apps/telegram/bot';

import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationRepository } from '##/modules/notifications/infra/typeorm/repositories/notification-repository';
import { buildAutoTrackTopicNotificationMessage } from '##/apps/telegram/messages/notificationMessages';
import sendRichTelegramMessage from '##/apps/telegram/services/send-rich-telegram-message';
import logger from '##/platform/logging/logger';
import { checkBotNotificationError } from '##/shared/services/utils';
import { InlineKeyboard } from 'grammy';
import { inject, injectable } from 'tsyringe';

interface AutoTrackTopicRequestNotificationData {
  bot: TelegramBot;
  telegramId: string;
  topic: Topic;
}

const trackTopicRepliesMenu = new InlineKeyboard().text('Yes, add to tracked topics', 'add-tt');

@injectable()
export default class SendAutoTrackTopicNotificationService {
  constructor(
    @inject(NotificationRepository)
    private readonly notificationRepository: NotificationRepository,

    @inject('CacheRepository')
    private readonly cache: ICacheProvider,
  ) {}

  private async saveAutoTrackTopicData(
    messageId: number,
    telegramId: string,
    topicId: number,
  ): Promise<void> {
    await this.cache.save(`autoTrackTopic:${messageId}`, {
      telegram_id: telegramId,
      topic_id: topicId,
    });
  }

  public async execute({
    bot,
    telegramId,
    topic,
  }: AutoTrackTopicRequestNotificationData): Promise<boolean> {
    let message: string = '';

    try {
      message = buildAutoTrackTopicNotificationMessage(topic);

      const sentMessage = await sendRichTelegramMessage<{ message_id: number }>(
        bot,
        telegramId,
        message,
        {
          reply_markup: trackTopicRepliesMenu,
        },
      );

      await this.saveAutoTrackTopicData(sentMessage.message_id, telegramId, topic.topic_id);
      await this.notificationRepository.createNotification<AutoTrackTopicRequestNotification>({
        type: NotificationType.AUTO_TRACK_TOPIC_REQUEST,
        telegram_id: telegramId,
        metadata: {
          topic_id: topic.topic_id,
          post_id: topic.post_id,
        },
      });

      logger.info(
        { telegram_id: telegramId, topic_id: topic.topic_id, post_id: topic.post_id, message },
        'Auto Track Topics notification was sent',
      );
      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, { topic_id: topic.topic_id, message });
      return false;
    }
  }
}
