import { Menu } from '@grammyjs/menu';
import { container } from 'tsyringe';

import type IMenuContext from '../@types/IMenuContext';

import TrackedBoardsRepository from '../../../../modules/posts/infra/typeorm/repositories/TrackedBoardsRepository';
import { editHtml, editHtmlMenu } from './menu-utils';

export const TRACKED_BOARDS_MENU_HTML =
  '<b>Tracked Boards</b>\n\nGet notified for new topics on your favorite boards.';

async function getTrackedBoard(telegramId: string, boardId: number) {
  const trackedBoardsRepository = container.resolve(TrackedBoardsRepository);
  return trackedBoardsRepository.findOne({ telegram_id: telegramId, board_id: boardId });
}

async function trackedBoardInfoHtml(ctx: IMenuContext) {
  const trackedBoard = await getTrackedBoard(
    String(ctx.chat.id),
    ctx.session.selectedTrackedBoardId,
  );
  return `<b>🗂️ Selected Tracked Board:</b>\n\n${trackedBoard.board_id} - ${trackedBoard.board.name}`;
}

const confirmRemoveTrackedBoardMenu = new Menu<IMenuContext>('tbr')
  .text('Yes, do it!', async (ctx) => {
    const trackedBoardsRepository = container.resolve(TrackedBoardsRepository);
    await trackedBoardsRepository.delete(String(ctx.chat.id), ctx.session.selectedTrackedBoardId);
    ctx.session.selectedTrackedBoardId = null;
    await editHtmlMenu(ctx, TRACKED_BOARDS_MENU_HTML, trackedBoardsMenu);
  })
  .row()
  .back('No, go back!', async (ctx) => {
    await editHtml(ctx, await trackedBoardInfoHtml(ctx));
  });

const trackedBoardInfoMenu = new Menu<IMenuContext>('tbi')
  .submenu('🗑️ Remove Board', 'tbr', async (ctx) => {
    const trackedBoard = await getTrackedBoard(
      String(ctx.chat.id),
      ctx.session.selectedTrackedBoardId,
    );
    await editHtml(
      ctx,
      `Are you sure you want to remove the tracked board: <b>${trackedBoard.board.name}</b>?`,
    );
  })
  .row()
  .back('↩ Go Back', async (ctx) => {
    ctx.session.selectedTrackedBoardId = null;
    await editHtml(ctx, TRACKED_BOARDS_MENU_HTML);
  });

const trackedBoardsMenu = new Menu<IMenuContext>('tbm')
  .dynamic(async (ctx, range) => {
    const trackedBoardsRepository = container.resolve(TrackedBoardsRepository);
    const trackedBoards = await trackedBoardsRepository.findByTelegramId(String(ctx.chat.id));
    const page = ctx.session.page ?? 0;
    const totalPages = Math.max(1, Math.ceil(trackedBoards.length / 10));
    const pageBoards = trackedBoards.slice(page * 10, (page + 1) * 10);

    for (const trackedBoard of pageBoards) {
      range
        .submenu(
          {
            text: `${trackedBoard.board_id} - ${trackedBoard.board.name}`,
            payload: String(trackedBoard.board_id),
          },
          'tbi',
          async (menuCtx) => {
            menuCtx.session.selectedTrackedBoardId = Number(menuCtx.match);
            await editHtml(menuCtx, await trackedBoardInfoHtml(menuCtx));
          },
        )
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
    await ctx.conversation.enter('addTrackedBoard', { overwrite: true });
  })
  .back('↩ Go Back', async (ctx) => {
    await editHtml(ctx, '<b>Notify me about...</b>\n\nChoose what should trigger notifications.');
  });

trackedBoardsMenu.register(trackedBoardInfoMenu);
trackedBoardInfoMenu.register(confirmRemoveTrackedBoardMenu);

export default trackedBoardsMenu;
