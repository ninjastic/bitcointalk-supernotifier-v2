import { Context } from 'telegraf/typings';

import ISession from '../@types/ISession';

import { handleUserIdConfirmAnswer } from '../menus/userIdConfirmMenu';
import { handleUsernameConfirmAnswer } from '../menus/usernameConfirmMenu';
import { handleConfigureMentionsAnswer } from '../menus/configureMentionsMenu';
import { handleConfigureMeritsAnswer } from '../menus/configureMeritsMenu';

interface CallbackHandlerContext extends Context {
  session: ISession;
}

const callbackHandler = async (
  ctx: CallbackHandlerContext,
  next: () => Promise<void>,
): Promise<void> => {
  if (ctx.callbackQuery) {
    const callbackData = ctx.callbackQuery.data;

    if (callbackData.startsWith('/prompt/username/')) {
      await handleUsernameConfirmAnswer(ctx);
    }

    if (callbackData.startsWith('/prompt/userId/')) {
      await handleUserIdConfirmAnswer(ctx);
    }

    if (callbackData.startsWith('/prompt/mentions/')) {
      await handleConfigureMentionsAnswer(ctx);
    }

    if (callbackData.startsWith('/prompt/merits/')) {
      await handleConfigureMeritsAnswer(ctx);
    }
  }

  next();
};

export default callbackHandler;
