import { MenuTemplate } from 'grammy-inline-menu';
import { container } from 'tsyringe';

import type IMenuContext from '../@types/IMenuContext';

import TrackedBoardsRepository from '../../../../modules/posts/infra/typeorm/repositories/TrackedBoardsRepository';

const trackedBoardsMenu = new MenuTemplate<IMenuContext>(() => ({
  text: '<b>Tracked Boards</b>\n\nGet notified for new topics on your favorite boards.',
  parse_mode: 'HTML',
}));

const confirmRemoveTrackedBoardMenu = new MenuTemplate<IMenuContext>(async (ctx) => {
  const trackedBoardsRepository = container.resolve(TrackedBoardsRepository);
  const trackedBoard = await trackedBoardsRepository.findOne({
    telegram_id: String(ctx.chat.id),
    board_id: Number(ctx.match[1]),
  });

  return {
    text: `Are you sure you want to remove the tracked board: <b>${trackedBoard.board.name}</b>?`,
    parse_mode: 'HTML',
  };
});

confirmRemoveTrackedBoardMenu.interact('Yes, do it!', 'yes', {
  do: async (ctx) => {
    const trackedBoardsRepository = container.resolve(TrackedBoardsRepository);
    await trackedBoardsRepository.delete(String(ctx.chat.id), Number(ctx.match[1]));
    return '/tb/';
  },
});

confirmRemoveTrackedBoardMenu.interact('No, go back!', 'no', {
  do: async () => `..`,
});

async function getTrackedBoard(telegramId: string, boardId: number) {
  const trackedBoardsRepository = container.resolve(TrackedBoardsRepository);
  const trackedBoard = await trackedBoardsRepository.findOne({
    telegram_id: telegramId,
    board_id: boardId,
  });
  return trackedBoard;
}

const trackedBoardInfoMenu = new MenuTemplate<IMenuContext>(async (ctx) => {
  const trackedBoard = await getTrackedBoard(String(ctx.chat.id), Number(ctx.match[1]));

  let message = '';
  message += '<b>🗂️ Selected Tracked Board:</b>\n\n';
  message += `${trackedBoard.board_id} - ${trackedBoard.board.name}`;

  return {
    text: message,
    parse_mode: 'HTML',
  };
});

trackedBoardInfoMenu.submenu('🗑️ Remove Board', 'remove', confirmRemoveTrackedBoardMenu);

trackedBoardInfoMenu.interact('↩ Go Back', 'back', {
  do: () => '..',
});

async function getTrackedBoards(ctx: IMenuContext) {
  const trackedBoardsRepository = container.resolve(TrackedBoardsRepository);
  const trackedBoards = await trackedBoardsRepository.findByTelegramId(String(ctx.chat.id));

  const choices = {};

  for (const trackedBoard of trackedBoards) {
    choices[trackedBoard.board_id] = `${trackedBoard.board_id} - ${trackedBoard.board.name}`;
  }

  return choices;
}

trackedBoardsMenu.chooseIntoSubmenu('tb', getTrackedBoards, trackedBoardInfoMenu, {
  maxRows: 10,
  columns: 1,
  getCurrentPage: ctx => ctx.session.page,
  setPage: (ctx, page) => {
    ctx.session.page = page;
  },
  disableChoiceExistsCheck: true,
});

trackedBoardsMenu.interact('✨ Add new', 'add', {
  do: async (ctx) => {
    await ctx.conversation.enter('addTrackedBoard', { overwrite: true });
    return true;
  },
});

trackedBoardsMenu.interact('↩ Go Back', 'back', {
  do: () => '..',
  joinLastRow: true,
});

export default trackedBoardsMenu;
