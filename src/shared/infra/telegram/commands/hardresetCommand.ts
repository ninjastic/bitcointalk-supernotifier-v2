import { CommandContext } from 'grammy';

import ICacheProvider from '##/shared/container/providers/models/ICacheProvider';
import IMenuContext from '../@types/IMenuContext';

import { Menu } from '@grammyjs/menu';
import { getManager } from 'typeorm';
import { container } from 'tsyringe';
import logger from '../../../services/logger';

export const hardResetConfirmInlineMenu = new Menu('hardreset')
  .text('Yes, I want to delete everything', async ctx => {
    const telegramId = ctx.chat.id;

    if (ctx.message.chat.type === 'group') {
      const user = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
      if (user.status !== 'creator' && user.status !== 'administrator') {
        return;
      }
    }

    logger.info({ telegramId }, 'Hard reset command executed');

    const cacheRepository = container.resolve<ICacheProvider>('CacheRepository')
    const manager = getManager();

    await manager.query(`DELETE FROM tracked_topics_users WHERE telegram_id = $1;`, [telegramId]);

    await manager.query(`DELETE FROM tracked_users WHERE telegram_id = $1;`, [telegramId]);

    await manager.query(`DELETE FROM tracked_phrases WHERE telegram_id = $1;`, [telegramId]);

    await manager.query(`DELETE FROM tracked_boards WHERE telegram_id = $1;`, [telegramId]);

    await manager.query(
      `UPDATE tracked_topics 
   SET tracking = array_remove(tracking, $1)
   WHERE $1 = ANY(tracking);`,
      [telegramId]
    );

    await manager.query(
      `UPDATE ignored_users 
   SET ignoring = array_remove(ignoring, $1)
   WHERE $1 = ANY(ignoring);`,
      [telegramId]
    );

    await manager.query(
      `UPDATE ignored_topics 
   SET ignoring = array_remove(ignoring, $1)
   WHERE $1 = ANY(ignoring);`,
      [telegramId]
    );

    await manager.query(`DELETE FROM ignored_boards WHERE telegram_id = $1;`, [telegramId]);

    await manager.query(`UPDATE users SET
        username = NULL,
        user_id = NULL,
        enable_mentions = FALSE,
        enable_merits = FALSE,
        enable_modlogs = FALSE,
        enable_auto_track_topics = FALSE
        enable_only_direct_mentions = FALSE,
      WHERE telegram_id = $1;`, [telegramId]);

    await cacheRepository.invalidate('trackedPhrases');
    await cacheRepository.invalidate(`trackedPhrases:${telegramId}`);

    await cacheRepository.invalidate(`trackedTopics:${telegramId}`);
    await cacheRepository.invalidate('trackedTopics');

    await cacheRepository.invalidate(`ignoredTopics:${telegramId}`);
    await cacheRepository.invalidate('ignoredTopics');

    await cacheRepository.invalidate(`ignoredUsers:${telegramId}`);
    await cacheRepository.invalidate('ignoredUsers');

    await ctx.deleteMessage();
    await ctx.reply('Done, you can start over running the command /start');
  })
  .row()
  .text("No, I don't want", ctx => ctx.deleteMessage());

const hardresetCommand = async (ctx: CommandContext<IMenuContext>): Promise<void> => {
  if (ctx.message.chat.type === 'group') {
    const user = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
    if (user.status !== 'creator' && user.status !== 'administrator') {
      return;
    }
  }

  await ctx.reply(
    'Are you sure you want to hard reset your account?\n\nThis will delete <b>EVERYTHING</b> related to your account from our database:\n\n<b>Username</b>\n<b>Forum ID</b>\n<b>Tracked Users</b>\n<b>Tracked Topics</b>\n<b>Tracked Boards</b>\n<b>Ignored Users</b>\n<b>Ignored Topics</b>\n<b>Ignored Boards</b>',
    { reply_markup: hardResetConfirmInlineMenu, parse_mode: 'HTML' }
  );
};

export default hardresetCommand;
