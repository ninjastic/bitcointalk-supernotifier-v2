import { StatelessQuestion } from '@grammyjs/stateless-question';
import { MenuTemplate, replyMenuToContext } from 'grammy-inline-menu';
import { container } from 'tsyringe';

import type IMenuContext from '../@types/IMenuContext';

import logger from '../../../services/logger';
import CreateTrackedPhraseService from '../services/CreateTrackedPhraseService';
import FindTrackedPhrasesByIdService from '../services/FindTrackedPhrasesByIdService';
import FindTrackedPhrasesByTelegramIdService from '../services/FindTrackedPhrasesByTelegramIdService';
import RemoveTrackedPhraseService from '../services/RemoveTrackedPhraseService';

const trackedPhrasesMenu = new MenuTemplate<IMenuContext>(() => ({
  text: '<b>Tracked Phrases</b>\n\nAdd or remove phrases so you get notified when they are mentioned.',
  parse_mode: 'HTML',
}));

const trackedPhraseInfoMenu = new MenuTemplate<IMenuContext>(async (ctx) => {
  const phraseId = ctx.match[1];

  const findTrackedPhrasesById = container.resolve(FindTrackedPhrasesByIdService);

  const { phrase } = await findTrackedPhrasesById.execute(phraseId);

  let message = '';
  message += '<b>Selected Phrase:</b>\n\n';
  message += phrase;

  return {
    text: message,
    parse_mode: 'HTML',
  };
});

const confirmRemoveTrackedPhraseMenu = new MenuTemplate<IMenuContext>(async (ctx) => {
  const phraseId = ctx.match[1];
  const findTrackedPhrasesById = container.resolve(FindTrackedPhrasesByIdService);
  const { phrase } = await findTrackedPhrasesById.execute(phraseId);

  return {
    text: `Are you sure you want to remove the tracked phrase: <b>${phrase}</b>?`,
    parse_mode: 'HTML',
  };
});

confirmRemoveTrackedPhraseMenu.interact('Yes, do it!', 'yes', {
  do: async (ctx) => {
    const removeTrackedPhrase = container.resolve(RemoveTrackedPhraseService);
    await removeTrackedPhrase.execute(ctx.match[1], String(ctx.chat.id));
    return '/tp/';
  },
});

confirmRemoveTrackedPhraseMenu.interact('No, go back!', 'no', {
  do: async () => `..`,
});

trackedPhraseInfoMenu.submenu('🗑️ Remove Phrase', 'remove', confirmRemoveTrackedPhraseMenu);

trackedPhraseInfoMenu.interact('↩ Go Back', 'back', {
  do: () => '..',
});

const addTrackedPhraseLinkQuestion = new StatelessQuestion('addPhrase', async (ctx: IMenuContext) => {
  const text = ctx.message.text.trim();

  const createTrackedPhrase = container.resolve(CreateTrackedPhraseService);

  try {
    const trackedPhrase = await createTrackedPhrase.execute({
      telegram_id: String(ctx.chat.id),
      phrase: text,
    });

    let message = '';
    message += 'You are now tracking the phrase:\n\n';
    message += `<b>${trackedPhrase.phrase}</b>`;

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: { remove_keyboard: true },
    });

    await replyMenuToContext(trackedPhrasesMenu, ctx, '/tp/');
  }
  catch (error) {
    if (error.message === 'Tracked phrase already exists') {
      await ctx.reply('You are already tracking this phrase.', {
        reply_markup: { remove_keyboard: true },
      });

      return;
    }

    logger.error({ telegram_id: ctx.chat.id, error }, 'Error while adding Tracked Phrase.');

    await ctx.reply('Something went wrong...', {
      reply_markup: { remove_keyboard: true },
    });
  }
});

async function getTrackedPhrasesList(ctx: IMenuContext) {
  const findTrackedPhrasesByTelegramId = container.resolve(FindTrackedPhrasesByTelegramIdService);

  const choices = await findTrackedPhrasesByTelegramId.execute(String(ctx.chat.id));

  const formatted = {};

  choices.forEach((choice) => {
    formatted[choice.id] = choice.phrase;
  });

  return formatted;
}

trackedPhrasesMenu.chooseIntoSubmenu('tp', getTrackedPhrasesList, trackedPhraseInfoMenu, {
  maxRows: 10,
  columns: 1,
  getCurrentPage: ctx => ctx.session.page,
  setPage: (ctx, page) => {
    ctx.session.page = page;
  },
  disableChoiceExistsCheck: true,
});

trackedPhrasesMenu.interact('✨ Add new', 'add', {
  do: async (ctx) => {
    const message = 'What is the phrase that you want to track?';

    await addTrackedPhraseLinkQuestion.replyWithHTML(ctx, message);
    return true;
  },
});

trackedPhrasesMenu.interact('↩ Go Back', 'back', {
  do: () => '..',
  joinLastRow: true,
});

export { addTrackedPhraseLinkQuestion };
export default trackedPhrasesMenu;
