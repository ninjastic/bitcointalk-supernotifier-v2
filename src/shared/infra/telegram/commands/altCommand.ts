import { container } from 'tsyringe';
import { Context } from 'telegraf/typings';
import { Message } from 'telegraf/typings/telegram-types';

import ISession from '../@types/ISession';

import SetUserAlternativeUsernameService from '../services/SetUserAlternativeUsernameService';

interface MenuContext extends Context {
  session: ISession;
}

const altCommand = async (ctx: MenuContext): Promise<Message> => {
  const setUserAlternativeUsername = container.resolve(
    SetUserAlternativeUsernameService,
  );

  const value = ctx.match[1];
  const telegram_id = ctx.message.from.id;

  if (!value) {
    return ctx.reply(
      'Something went wrong... Are you sure you choose a valid username?',
    );
  }

  await setUserAlternativeUsername.execute(telegram_id, value);

  return ctx.reply(`Done! Your alternative username is now: <b>${value}</b>`, {
    parse_mode: 'HTML',
  });
};

export default altCommand;
