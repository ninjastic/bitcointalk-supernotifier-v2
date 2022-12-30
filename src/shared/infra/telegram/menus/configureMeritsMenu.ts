import { Context } from 'telegraf';
import { MenuTemplate } from 'telegraf-inline-menu';
import { container } from 'tsyringe';

import bot from '../index';

import ISession from '../@types/ISession';

import CreateUserService from '../../../../modules/users/services/CreateUserService';
import FindUserByTelegramIdService from '../services/FindUserByTelegramIdService';
import UpdateUserByTelegramIdService from '../services/UpdateUserByTelegramIdService';

import { mainMenuMiddleware } from '.';

interface MenuContext extends Context {
  session: ISession;
}

const configureMeritsMenu = new MenuTemplate<MenuContext>(async () => {
  return {
    text: `Do you want to be notified of new <b>merits</b>?`,
    parse_mode: 'HTML',
  };
});

configureMeritsMenu.interact('Yes', 'yes', {
  do: async ctx => {
    await ctx.answerCbQuery();

    return false;
  },
});

configureMeritsMenu.interact('No', 'no', {
  joinLastRow: true,
  do: async ctx => {
    await ctx.answerCbQuery();

    return false;
  },
});

export const handleConfigureMeritsAnswer = async (
  ctx: MenuContext,
): Promise<void> => {
  const callback = ctx.callbackQuery;

  if (callback.data === '/prompt/merits/no') {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    ctx.session.merits = false;
    await bot.session.saveSession(bot.session.getSessionKey(ctx), ctx.session);

    await ctx.reply("We won't notify you of new merits.");
  } else if (callback.data === '/prompt/merits/yes') {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    ctx.session.merits = true;
    await bot.session.saveSession(bot.session.getSessionKey(ctx), ctx.session);

    await ctx.reply('We will notify you of new merits.');
  }

  const createUser = container.resolve(CreateUserService);

  const { userId, username, alternative_usernames, mentions, merits } =
    ctx.session;

  const findUserByTelegramId = container.resolve(FindUserByTelegramIdService);
  const updateUserByTelegramId = container.resolve(
    UpdateUserByTelegramIdService,
  );

  const telegram_id = ctx.update.callback_query.from.id;

  const userExists = await findUserByTelegramId.execute(telegram_id);

  if (!userExists) {
    await createUser.execute({
      user_id: userId,
      username,
      alternative_usernames: alternative_usernames || [],
      enable_mentions: mentions,
      enable_merits: merits,
      language: 'en',
      telegram_id,
      blocked: false,
    });
  } else {
    await updateUserByTelegramId.execute(telegram_id, {
      user_id: userId,
      username,
      alternative_usernames: alternative_usernames || [],
      enable_mentions: mentions,
      enable_merits: merits,
      language: 'en',
      telegram_id,
      blocked: false,
    });
  }

  await mainMenuMiddleware.replyToContext(ctx);
};

export default configureMeritsMenu;
