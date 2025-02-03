import { container, injectable } from 'tsyringe';
import escape from 'escape-html';
import { Bot, InlineKeyboard } from 'grammy';

import TelegramBot from '##/shared/infra/telegram/bot';
import logger from '##/shared/services/logger';
import RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import Topic from '##/modules/posts/infra/typeorm/entities/Topic';
import AddTrackedTopicService from '##/modules/posts/services/AddTrackedTopicService';
import { checkBotNotificationError } from '##/shared/services/utils';
import {
  AutoTrackTopicRequestNotification,
  NotificationType
} from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationService } from '##/modules/posts/services/notification-service';

type AutoTrackTopicRequestNotificationData = {
  bot: TelegramBot;
  telegramId: string;
  topic: Topic;
};

const trackTopicRepliesMenu = new InlineKeyboard().text('Yes, add to tracked topics', 'add-tt');

@injectable()
export default class SendAutoTrackTopicNotificationService {
  private redis: RedisProvider;

  constructor() {
    this.redis = container.resolve(RedisProvider);
  }

  private async createNotification(telegramId: string, metadata: AutoTrackTopicRequestNotification['metadata']) {
    const notificationService = new NotificationService();
    await notificationService.createNotification<AutoTrackTopicRequestNotification>({
      type: NotificationType.AUTO_TRACK_TOPIC_REQUEST,
      telegram_id: telegramId,
      metadata
    });
  }

  private async buildNotificationMessage(topic: Topic): Promise<string> {
    const { title, topic_id, post_id } = topic.post;
    return (
      `📖 You created a new topic <a href="https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}">` +
      `${escape(title)}</a>\n\n` +
      `Do you want to track replies on this topic?`
    );
  }

  private async saveAutoTrackTopicData(messageId: number, telegramId: string, topicId: number): Promise<void> {
    await this.redis.save(`autoTrackTopic:${messageId}`, { telegram_id: telegramId, topic_id: topicId });
  }

  public async execute({ bot, telegramId, topic }: AutoTrackTopicRequestNotificationData): Promise<boolean> {
    let message: string;

    try {
      message = await this.buildNotificationMessage(topic);

      const sentMessage = await bot.instance.api.sendMessage(telegramId, message, {
        parse_mode: 'HTML',
        reply_markup: trackTopicRepliesMenu
      });

      await this.saveAutoTrackTopicData(sentMessage.message_id, telegramId, topic.topic_id);
      await this.createNotification(telegramId, { topic_id: topic.topic_id, post_id: topic.post_id });

      logger.info(
        { telegram_id: telegramId, topic_id: topic.topic_id, post_id: topic.post_id, message },
        'Auto Track Topics notification was sent'
      );
      return true;
    } catch (error) {
      await checkBotNotificationError(error, telegramId, { topic_id: topic.topic_id, message });
      return false;
    }
  }
}

export const handleTrackTopicRepliesMenu = (_bot: Bot) =>
  _bot.callbackQuery('add-tt', async ctx => {
    const statusMessage = await ctx.reply(
      'We have added your request to the queue.\n\nThis will take a few seconds...'
    );

    const redis = container.resolve(RedisProvider);
    const addTrackedTopicService = container.resolve(AddTrackedTopicService);

    const data: { topic_id: number } = await redis.recover(
      `autoTrackTopic:${ctx.update.callback_query.message.message_id}`
    );

    if (data) {
      try {
        const trackedTopic = await addTrackedTopicService.execute(data.topic_id, String(ctx.chat.id));
        await ctx.api.deleteMessage(statusMessage.chat.id, statusMessage.message_id);

        const message = `You are now tracking the topic: <b><a href="https://bitcointalk.org/index.php?topic=${trackedTopic.post.topic_id}">${trackedTopic.post.title}</a></b>`;
        await ctx.reply(message, { parse_mode: 'HTML' });
      } catch (error) {
        await ctx.api.deleteMessage(statusMessage.chat.id, statusMessage.message_id);
        await ctx.reply(error.message, { parse_mode: 'HTML' });
      }
    }

    await ctx.answerCallbackQuery();
  });
