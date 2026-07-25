import type { PostMentionNotification } from '##/modules/notifications/infra/typeorm/entities/Notification';
import type Post from '##/modules/posts/infra/typeorm/entities/Post';
import type ICacheProvider from '##/platform/cache/providers/models/ICacheProvider';
import type { RecipeMetadata } from '##/platform/queues/types/telegram';
import type TelegramBot from '##/apps/telegram/bot';

import { NotificationType } from '##/modules/notifications/infra/typeorm/entities/Notification';
import { NotificationRepository } from '##/modules/notifications/infra/typeorm/repositories/notification-repository';
import SetPostHistoryNotifiedService from '##/modules/posts/services/SetPostHistoryNotifiedService';
import SetPostNotifiedService from '##/modules/posts/services/SetPostNotifiedService';
import { buildMentionNotificationMessage } from '##/apps/telegram/messages/notificationMessages';
import sendRichTelegramMessage from '##/apps/telegram/services/send-rich-telegram-message';
import logger from '##/platform/logging/logger';
import { checkBotNotificationError } from '##/shared/services/utils';
import { inject, injectable } from 'tsyringe';

import { filterMentionContent } from './filter-mention-content';

type MentionNotificationData = RecipeMetadata['sendMentionNotification'] & {
  bot: TelegramBot;
};

@injectable()
export default class SendMentionNotification {
  constructor(
    @inject('CacheRepository')
    private readonly cacheRepository: ICacheProvider,

    @inject(SetPostNotifiedService)
    private readonly setPostNotified: SetPostNotifiedService,

    @inject(SetPostHistoryNotifiedService)
    private readonly setPostHistoryNotified: SetPostHistoryNotifiedService,

    @inject(NotificationRepository)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  private async markPostAsNotified(
    post: Post,
    telegramId: string,
    history: boolean,
  ): Promise<void> {
    if (history) {
      await this.setPostHistoryNotified.execute(post.post_id, telegramId);
    } else {
      await this.setPostNotified.execute(post.post_id, telegramId);
    }
  }

  public async execute({
    bot,
    post,
    user,
    history,
    mentionType,
  }: MentionNotificationData): Promise<boolean> {
    let message: string = '';

    try {
      const postLength =
        (await this.cacheRepository.recover<number>(`${user.telegram_id}:postLength`)) ?? 150;

      message = buildMentionNotificationMessage(
        post,
        filterMentionContent(post.content, user.username, mentionType),
        postLength,
        user.telegram_id,
      );

      await sendRichTelegramMessage(bot, user.telegram_id, message);

      logger.info(
        { telegram_id: user.telegram_id, post_id: post.post_id, history, message },
        'Mention notification was sent',
      );

      await this.markPostAsNotified(post, user.telegram_id, history);
      await this.notificationRepository.createNotification<PostMentionNotification>({
        type: NotificationType.POST_MENTION,
        telegram_id: user.telegram_id,
        metadata: { post_id: post.post_id, history },
      });

      return true;
    } catch (error) {
      await checkBotNotificationError(error, user.telegram_id, {
        post_id: post.post_id,
        message,
        history,
      });
      return false;
    }
  }
}
