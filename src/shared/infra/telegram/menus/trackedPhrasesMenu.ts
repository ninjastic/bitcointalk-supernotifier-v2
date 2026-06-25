import { Menu } from '@grammyjs/menu';
import { StatelessQuestion } from '@grammyjs/stateless-question';
import { container } from 'tsyringe';

import type IMenuContext from '../@types/IMenuContext';

import logger from '../../../services/logger';
import CreateTrackedPhraseService from '../services/CreateTrackedPhraseService';
import FindTrackedPhrasesByIdService from '../services/FindTrackedPhrasesByIdService';
import FindTrackedPhrasesByTelegramIdService from '../services/FindTrackedPhrasesByTelegramIdService';
import RemoveTrackedPhraseService from '../services/RemoveTrackedPhraseService';
import { editHtml, editHtmlMenu, replyHtmlMenu } from './menu-utils';

export const TRACKED_PHRASES_MENU_HTML =
  '<b>Tracked Phrases</b>\n\nAdd or remove phrases so you get notified when they are mentioned.';

async function getPhrase(phraseId: string) {
  const findTrackedPhrasesById = container.resolve(FindTrackedPhrasesByIdService);
  return findTrackedPhrasesById.execute(phraseId);
}

async function trackedPhraseInfoHtml(ctx: IMenuContext) {
  const { phrase } = await getPhrase(ctx.session.selectedTrackedPhraseId);
  return `<b>Selected Phrase:</b>\n\n${phrase}`;
}

const confirmRemoveTrackedPhraseMenu = new Menu<IMenuContext>('tpr')
  .text('Yes, do it!', async (ctx) => {
    const removeTrackedPhrase = container.resolve(RemoveTrackedPhraseService);
    await removeTrackedPhrase.execute(ctx.session.selectedTrackedPhraseId, String(ctx.chat.id));
    ctx.session.selectedTrackedPhraseId = null;
    await editHtmlMenu(ctx, TRACKED_PHRASES_MENU_HTML, trackedPhrasesMenu);
  })
  .row()
  .back('No, go back!', async (ctx) => {
    await editHtml(ctx, await trackedPhraseInfoHtml(ctx));
  });

const trackedPhraseInfoMenu = new Menu<IMenuContext>('tpi')
  .submenu('🗑️ Remove Phrase', 'tpr', async (ctx) => {
    const { phrase } = await getPhrase(ctx.session.selectedTrackedPhraseId);
    await editHtml(ctx, `Are you sure you want to remove the tracked phrase: <b>${phrase}</b>?`);
  })
  .row()
  .back('↩ Go Back', async (ctx) => {
    ctx.session.selectedTrackedPhraseId = null;
    await editHtml(ctx, TRACKED_PHRASES_MENU_HTML);
  });

const trackedPhrasesMenu = new Menu<IMenuContext>('tpm')
  .dynamic(async (ctx, range) => {
    const findTrackedPhrasesByTelegramId = container.resolve(FindTrackedPhrasesByTelegramIdService);
    const choices = await findTrackedPhrasesByTelegramId.execute(String(ctx.chat.id));
    const page = ctx.session.page ?? 0;
    const totalPages = Math.max(1, Math.ceil(choices.length / 10));

    for (const choice of choices.slice(page * 10, (page + 1) * 10)) {
      range
        .submenu({ text: choice.phrase, payload: choice.id }, 'tpi', async (menuCtx) => {
          menuCtx.session.selectedTrackedPhraseId = menuCtx.match;
          await editHtml(menuCtx, await trackedPhraseInfoHtml(menuCtx));
        })
        .row();
    }

    if (totalPages > 1) {
      if (page > 0)
        range.text('◀️ Prev', (menuCtx) => {
          menuCtx.session.page = page - 1;
          menuCtx.menu.update();
        });
      range.text(`${page + 1}/${totalPages}`, (menuCtx) =>
        menuCtx.answerCallbackQuery(`Page ${page + 1} of ${totalPages}`),
      );
      if (page < totalPages - 1)
        range.text('Next ▶️', (menuCtx) => {
          menuCtx.session.page = page + 1;
          menuCtx.menu.update();
        });
      range.row();
    }
  })
  .text('✨ Add new', async (ctx) => {
    await addTrackedPhraseLinkQuestion.replyWithHTML(
      ctx,
      'What is the phrase that you want to track?',
    );
  })
  .back('↩ Go Back', async (ctx) => {
    await editHtml(ctx, '<b>Notify me about...</b>\n\nChoose what should trigger notifications.');
  });

trackedPhrasesMenu.register(trackedPhraseInfoMenu);
trackedPhraseInfoMenu.register(confirmRemoveTrackedPhraseMenu);

const addTrackedPhraseLinkQuestion = new StatelessQuestion(
  'addPhrase',
  async (ctx: IMenuContext) => {
    const text = ctx.message.text.trim();
    const createTrackedPhrase = container.resolve(CreateTrackedPhraseService);

    try {
      await createTrackedPhrase.execute({ telegram_id: String(ctx.chat.id), phrase: text });
      await replyHtmlMenu(ctx, TRACKED_PHRASES_MENU_HTML, trackedPhrasesMenu);
    } catch (error) {
      if (error.message === 'Tracked phrase already exists') {
        await ctx.reply('You are already tracking this phrase.', {
          reply_markup: { remove_keyboard: true },
        });
        return;
      }

      logger.error({ telegram_id: ctx.chat.id, error }, 'Error while adding Tracked Phrase.');
      await ctx.reply('Something went wrong...', { reply_markup: { remove_keyboard: true } });
    }
  },
);

export { addTrackedPhraseLinkQuestion };
export default trackedPhrasesMenu;
