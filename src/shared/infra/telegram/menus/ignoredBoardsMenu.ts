import { Menu } from '@grammyjs/menu';
import IgnoredBoard from '##/modules/posts/infra/typeorm/entities/IgnoredBoard';
import { getRepository } from 'typeorm';

import type IMenuContext from '../@types/IMenuContext';

import { editHtml, editHtmlMenu } from './menu-utils';

export const IGNORED_BOARDS_MENU_HTML =
  "<b>Ignored Boards</b>\n\nAdd or remove ignored boards so you don't get notifications from them.";

async function getIgnoredBoard(telegramId: string, boardId: number) {
  const ignoredBoardsRepository = getRepository(IgnoredBoard);
  return ignoredBoardsRepository.findOne(
    { telegram_id: telegramId, board_id: boardId },
    { relations: ['board'] },
  );
}

async function ignoredBoardInfoHtml(ctx: IMenuContext) {
  const ignoredBoard = await getIgnoredBoard(
    String(ctx.chat.id),
    ctx.session.selectedIgnoredBoardId,
  );
  return `<b>🗂️ Selected Ignored Board:</b>\n\n${ignoredBoard.board_id} - ${ignoredBoard.board.name}`;
}

const confirmRemoveIgnoredBoardMenu = new Menu<IMenuContext>('ibr')
  .text('Yes, do it!', async (ctx) => {
    const ignoredBoardsRepository = getRepository(IgnoredBoard);
    await ignoredBoardsRepository.delete({
      telegram_id: String(ctx.chat.id),
      board_id: ctx.session.selectedIgnoredBoardId,
    });
    ctx.session.selectedIgnoredBoardId = null;
    await editHtmlMenu(ctx, IGNORED_BOARDS_MENU_HTML, ignoredBoardsMenu);
  })
  .row()
  .back('No, go back!', async (ctx) => {
    await editHtml(ctx, await ignoredBoardInfoHtml(ctx));
  });

const ignoredBoardInfoMenu = new Menu<IMenuContext>('ibi')
  .submenu('🗑️ Remove Board', 'ibr', async (ctx) => {
    const ignoredBoard = await getIgnoredBoard(
      String(ctx.chat.id),
      ctx.session.selectedIgnoredBoardId,
    );
    await editHtml(
      ctx,
      `Are you sure you want to remove the ignored board: <b>${ignoredBoard.board.name}</b>?`,
    );
  })
  .row()
  .back('↩ Go Back', async (ctx) => {
    ctx.session.selectedIgnoredBoardId = null;
    await editHtml(ctx, IGNORED_BOARDS_MENU_HTML);
  });

const ignoredBoardsMenu = new Menu<IMenuContext>('ibm')
  .dynamic(async (ctx, range) => {
    const ignoredBoardsRepository = getRepository(IgnoredBoard);
    const ignoredBoards = await ignoredBoardsRepository.find({
      where: { telegram_id: String(ctx.chat.id) },
      relations: ['board'],
    });
    const page = ctx.session.page ?? 0;
    const totalPages = Math.max(1, Math.ceil(ignoredBoards.length / 10));

    for (const ignoredBoard of ignoredBoards.slice(page * 10, (page + 1) * 10)) {
      range
        .submenu(
          {
            text: `${ignoredBoard.board_id} - ${ignoredBoard.board.name}`,
            payload: String(ignoredBoard.board_id),
          },
          'ibi',
          async (menuCtx) => {
            menuCtx.session.selectedIgnoredBoardId = Number(menuCtx.match);
            await editHtml(menuCtx, await ignoredBoardInfoHtml(menuCtx));
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
    await ctx.conversation.enter('addIgnoredBoard', { overwrite: true });
  })
  .back('↩ Go Back', async (ctx) => {
    await editHtml(ctx, "<b>Don't notify me about...</b>\n\nChoose what should be ignored.");
  });

ignoredBoardsMenu.register(ignoredBoardInfoMenu);
ignoredBoardInfoMenu.register(confirmRemoveIgnoredBoardMenu);

export default ignoredBoardsMenu;
