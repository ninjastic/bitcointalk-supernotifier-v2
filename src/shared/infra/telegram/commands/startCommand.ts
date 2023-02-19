import { ConversationFlavor } from '@grammyjs/conversations';
import { CommandContext } from 'grammy';

import IMenuContext from '../@types/IMenuContext';

const startCommand = async (ctx: ConversationFlavor & CommandContext<IMenuContext>): Promise<void> => {
  await ctx.reply('Hello! Welcome to the BitcoinTalk SuperNotifier V2!');

  await ctx.conversation.enter('setup', { overwrite: true });
};

export default startCommand;
