import { Context } from 'telegraf';
import { MenuTemplate } from 'telegraf-inline-menu';
import { container } from 'tsyringe';
import TelegrafStatelessQuestion from 'telegraf-stateless-question';

import logger from '../../../services/logger';

import ISession from '../@types/ISession';

import FindTrackedPhrasesByTelegramIdService from '../services/FindTrackedPhrasesByTelegramIdService';
import CreateTrackedPhraseService from '../services/CreateTrackedPhraseService';
import RemoveTrackedPhraseService from '../services/RemoveTrackedPhraseService';

import { trackedPhrasesMenuMiddleware } from './index';

interface MenuContext extends Context {
  session: ISession;
}

const trackedPhrasesMenu = new MenuTemplate<MenuContext>(() => {
  return {
    text: `<b>Tracked Phrases</b>\n\nAdd or remove phrases so you get notified when they are mentioned.`,
    parse_mode: 'HTML',
  };
});

const trackedPhraseInfoMenu = new MenuTemplate<MenuContext>(async ctx => {
  const phrase = ctx.match[1];

  let message = '';
  message += `<b>Selected Phrase:</b>\n\n`;
  message += phrase;

  return {
    text: message,
    parse_mode: 'HTML',
  };
});

const confirmRemoveTrackedPhraseMenu = new MenuTemplate<MenuContext>(
  async ctx => {
    const phrase = ctx.match[1];

    return {
      text: `Are you sure you want to remove the tracked phrase: <b>${phrase}</b>?`,
      parse_mode: 'HTML',
    };
  },
);

confirmRemoveTrackedPhraseMenu.interact('Yes, do it!', 'yes', {
  do: async ctx => {
    const removeTrackedPhrase = container.resolve(RemoveTrackedPhraseService);

    await removeTrackedPhrase.execute(ctx.match[1], ctx.chat.id);

    return '/main/tp/';
  },
});

confirmRemoveTrackedPhraseMenu.interact('No, go back!', 'no', {
  do: async () => {
    return `..`;
  },
});

trackedPhraseInfoMenu.submenu(
  '❌ Remove Phrase',
  'remove',
  confirmRemoveTrackedPhraseMenu,
);

trackedPhraseInfoMenu.interact('↩ Go Back', 'back', {
  do: () => {
    return '..';
  },
});

const addTrackedPhraseLinkQuestion = new TelegrafStatelessQuestion(
  'addPhrase',
  async (ctx: MenuContext) => {
    const text = ctx.message.text.trim();

    const createTrackedPhrase = container.resolve(CreateTrackedPhraseService);

    try {
      const trackedPhrase = await createTrackedPhrase.execute({
        telegram_id: ctx.chat.id,
        phrase: text,
      });

      let message = '';
      message += 'You are now tracking the phrase:\n\n';
      message += `<b>${trackedPhrase.phrase}</b>`;

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: { remove_keyboard: true },
      });

      await trackedPhrasesMenuMiddleware.replyToContext(ctx);
    } catch (error) {
      if (error.message === 'Tracked phrase already exists') {
        await ctx.reply('You are already tracking this phrase.', {
          reply_markup: { remove_keyboard: true },
        });

        return;
      }

      logger.error(
        { telegram_id: ctx.chat.id, error },
        'Error while adding Tracked Phrase.',
      );

      await ctx.reply('Something went wrong...', {
        reply_markup: { remove_keyboard: true },
      });
    }
  },
);

const getTrackedPhrasesList = async (ctx: MenuContext) => {
  const findTrackedPhrasesByTelegramId = container.resolve(
    FindTrackedPhrasesByTelegramIdService,
  );

  const choices = await findTrackedPhrasesByTelegramId.execute(ctx.chat.id);

  const formatted = {};

  choices.forEach(choice => {
    formatted[choice.phrase] = choice.phrase;
  });

  return formatted;
};

trackedPhrasesMenu.chooseIntoSubmenu(
  'tp',
  getTrackedPhrasesList,
  trackedPhraseInfoMenu,
  {
    maxRows: 4,
    columns: 1,
    getCurrentPage: ctx => ctx.session.page,
    setPage: (ctx, page) => {
      ctx.session.page = page;
    },
    disableChoiceExistsCheck: true,
  },
);

trackedPhrasesMenu.interact('✨ Add new', 'add', {
  do: async ctx => {
    const message = 'What is the phrase that you want to track?';

    await addTrackedPhraseLinkQuestion.replyWithHTML(ctx, message);
    return true;
  },
});

trackedPhrasesMenu.interact('↩ Go Back', 'back', {
  do: () => {
    return '..';
  },
  joinLastRow: true,
});

export { addTrackedPhraseLinkQuestion };
export default trackedPhrasesMenu;
