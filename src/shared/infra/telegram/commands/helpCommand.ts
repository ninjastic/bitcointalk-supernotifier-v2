import type { CommandContext } from 'grammy';

import type IMenuContext from '../@types/IMenuContext';

async function helpCommand(ctx: CommandContext<IMenuContext>): Promise<void> {
  const commands = [
    {
      command: '/start',
      description: 'Restarts the bot setup.',
    },
    {
      command: '/menu',
      description: 'Shows the cool menu.',
    },
    {
      command: '/alt USERNAME',
      description: 'Sets an alternative (extra) username for mention notifications.',
    },
    {
      command: '/setMerit XXX',
      description: 'Corrects your cached merit count.',
    },
    {
      command: '/minPosts XXX',
      description:
        'Sets the minimum of posts a user should have to trigger a notification for new topics. Good to avoid spammers.',
    },
    {
      command: '/length XXX',
      description: 'Sets the maximum number of characters for the post preview on notifications.',
    },
    {
      command: '/reset',
      description: 'Resets your account conversation state. Useful if the bot is stuck.',
    },
    {
      command: '/hardreset',
      description: 'Hard resets the bot state and deletes all your account information <b>(!DANGER!)</b>',
    },
    {
      command: '/info',
      description: 'Shows your account debug information. Useful for troubleshooting.',
    },
  ];
  await ctx.reply(
    `<b>Commands</b>\n\n${commands
      .map(({ command, description }) => `<b>${command}</b> => ${description}`)
      .join('\n\n')}`,
    { parse_mode: 'HTML' },
  );
}

export default helpCommand;
