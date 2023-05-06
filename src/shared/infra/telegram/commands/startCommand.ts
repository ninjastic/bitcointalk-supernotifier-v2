import { ConversationFlavor } from '@grammyjs/conversations';
import { CommandContext } from 'grammy';

import IMenuContext from '../@types/IMenuContext';

const startCommand = async (ctx: ConversationFlavor & CommandContext<IMenuContext>): Promise<void> => {
  await ctx.reply('Hello! Welcome to the BitcoinTalk SuperNotifier V2!');

  if (ctx.message.chat.type === 'group') {
    const user = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
    if (user.status !== 'creator' && user.status !== 'administrator') {
      return;
    }

    ctx.reply("Looks like we are talking in a group chat, which aren't supported as of now.");
    ctx.session.isGroup = true;
    return;
  }

  ctx.session.isGroup = false;
  await ctx.conversation.enter('setup', { overwrite: true });
};

export default startCommand;
