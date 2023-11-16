import { container } from 'tsyringe';
import escape from 'escape-html';
import { Bot, InlineKeyboard } from 'grammy';

import bot from '../index';
import logger from '../../../services/logger';
import RedisProvider from '../../../container/providers/implementations/RedisProvider';
import Topic from '../../../../modules/posts/infra/typeorm/entities/Topic';
import AddTrackedTopicService from '../../../../modules/posts/services/AddTrackedTopicService';
import { checkBotNotificationError } from '../../../services/utils';

const trackTopicRepliesMenu = new InlineKeyboard().text('Yes, add to tracked topics', 'add-tt');
const redis = container.resolve(RedisProvider);

export const handleTrackTopicRepliesMenu = (_bot: Bot) =>
  _bot.callbackQuery('add-tt', async ctx => {
    const statusMessage = await ctx.reply(
      'We have added your request to the queue.\n\nThis will take a few seconds...'
    );

    const addTrackedTopicService = container.resolve(AddTrackedTopicService);
    const data: { topic_id: number } = await redis.recover(
      `autoTrackTopic:${ctx.update.callback_query.message.message_id}`
    );

    if (data) {
      try {
        const trackedTopic = await addTrackedTopicService.execute(data.topic_id, String(ctx.chat.id));
        await ctx.api.deleteMessage(statusMessage.chat.id, statusMessage.message_id);

        let message = '';
        message += 'You are now tracking the topic: ';
        message += `<b><a href="https://bitcointalk.org/index.php?topic=${trackedTopic.post.topic_id}">${trackedTopic.post.title}</a></b>`;

        await ctx.reply(message, {
          parse_mode: 'HTML'
        });
      } catch (error) {
        await ctx.api.deleteMessage(statusMessage.chat.id, statusMessage.message_id);
        await ctx.reply(error.message, {
          parse_mode: 'HTML'
        });
      }
    }

    await ctx.answerCallbackQuery();
  });

export default class SendAutoTrackTopicNotificationService {
  public async execute(telegram_id: string, topic: Topic): Promise<boolean> {
    const { title, topic_id, post_id } = topic.post;

    let message = '';
    message += `📖 You created a new topic <a href="https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}">`;
    message += `${escape(title)}`;
    message += `</a>\n\n`;
    message += `Do you want to track replies on this topic?`;

    return bot.instance.api
      .sendMessage(telegram_id, message, { parse_mode: 'HTML', reply_markup: trackTopicRepliesMenu })
      .then(async sentMessage => {
        await redis.save(`autoTrackTopic:${sentMessage.message_id}`, { telegram_id, topic_id });
        logger.info({ telegram_id, topic_id: topic.topic_id, message }, 'Auto Track Topics notification was sent');
        return true;
      })
      .catch(async error => {
        await checkBotNotificationError(error, telegram_id, { topic_id: topic.topic_id, message });
        return false;
      });
  }
}
