import type { ConversationFlavor } from '@grammyjs/conversations';
import type { CommandContext } from 'grammy';

import { replyMenuToContext } from 'grammy-inline-menu';
import { container } from 'tsyringe';

import type IMenuContext from '../@types/IMenuContext';

import UsersRepository from '../../../../modules/users/infra/typeorm/repositories/UsersRepository';
import { mainMenu } from '../menus/mainMenu';

async function startCommand(ctx: ConversationFlavor & CommandContext<IMenuContext>): Promise<void> {
  if (ctx.message.chat.type === 'private') {
    ctx.session.isGroup = false;
    await ctx.reply('Hello! Welcome to the BitcoinTalk SuperNotifier V2!');
    await ctx.conversation.enter('setup', { overwrite: true });
  }

  if (ctx.message.chat.type === 'group') {
    const user = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
    if (user.status !== 'creator' && user.status !== 'administrator') {
      return;
    }

    ctx.session.isGroup = true;
    const userRepository = container.resolve(UsersRepository);
    let group = await userRepository.findOne({ telegram_id: String(ctx.chat.id), is_group: true });

    if (group) {
      group.blocked = false;
      await userRepository.save(group);
    }
    else {
      group = userRepository.create({
        enable_mentions: false,
        enable_merits: false,
        blocked: false,
        telegram_id: String(ctx.chat.id),
        username: null,
        user_id: null,
        alternative_usernames: [],
        language: 'en',
        is_group: true,
      });
      await userRepository.save(group);
      await ctx.reply('Group initiated!');
    }

    await replyMenuToContext(mainMenu, ctx, '/');
  }
}

export default startCommand;
