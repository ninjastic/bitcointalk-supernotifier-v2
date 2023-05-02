import { container } from 'tsyringe';
import { HearsContext } from 'grammy';

import IMenuContext from '../@types/IMenuContext';

import SetUserAlternativeUsernameService from '../services/SetUserAlternativeUsernameService';

const altCommand = async (ctx: HearsContext<IMenuContext>): Promise<void> => {
  const setUserAlternativeUsername = container.resolve(SetUserAlternativeUsernameService);

  const value = ctx.match[1];
  const telegram_id = ctx.message.from.id;

  if (!value) {
    await ctx.reply('Are you sure you chose a valid username?');
  } else {
    await setUserAlternativeUsername.execute(String(telegram_id), value);

    await ctx.reply(`Done! Your alternative username is now: <b>${value}</b>`, {
      parse_mode: 'HTML'
    });
  }
};

export default altCommand;
