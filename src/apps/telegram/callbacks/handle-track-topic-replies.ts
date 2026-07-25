import type ICacheProvider from '##/platform/cache/providers/models/ICacheProvider';
import type IMenuContext from '##/apps/telegram/types/IMenuContext';
import type { Bot } from 'grammy';

import AddTrackedTopicService from '##/modules/posts/services/AddTrackedTopicService';
import { container } from 'tsyringe';

export function handleTrackTopicRepliesMenu(bot: Bot<IMenuContext>) {
  const cache = container.resolve<ICacheProvider>('CacheRepository');
  const addTrackedTopic = container.resolve(AddTrackedTopicService);

  return bot.callbackQuery('add-tt', async (ctx) => {
    const statusMessage = await ctx.reply(
      'We have added your request to the queue.\n\nThis will take a few seconds...',
    );

    const data: { topic_id: number } | null = await cache.recover(
      `autoTrackTopic:${ctx.update.callback_query.message.message_id}`,
    );

    if (data) {
      try {
        const trackedTopic = await addTrackedTopic.execute(data.topic_id, String(ctx.chat.id));
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
}
