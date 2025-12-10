import IgnoredBoard from '##/modules/posts/infra/typeorm/entities/IgnoredBoard';
import { MenuTemplate } from 'grammy-inline-menu';
import { getRepository } from 'typeorm';

import type IMenuContext from '../@types/IMenuContext';

const ignoredBoardsMenu = new MenuTemplate<IMenuContext>(() => ({
  text: '<b>Ignored Boards</b>\n\nAdd or remove ignored boards so you don\'t get notifications from them.',
  parse_mode: 'HTML',
}));

const confirmRemoveIgnoredBoardMenu = new MenuTemplate<IMenuContext>(async (ctx) => {
  const ignoredBoardsRepository = getRepository(IgnoredBoard);
  const ignoredBoard = await ignoredBoardsRepository.findOne(
    {
      telegram_id: String(ctx.chat.id),
      board_id: Number(ctx.match[1]),
    },
    { relations: ['board'] },
  );

  return {
    text: `Are you sure you want to remove the ignored board: <b>${ignoredBoard.board.name}</b>?`,
    parse_mode: 'HTML',
  };
});

confirmRemoveIgnoredBoardMenu.interact('Yes, do it!', 'yes', {
  do: async (ctx) => {
    const ignoredBoardsRepository = getRepository(IgnoredBoard);
    await ignoredBoardsRepository.delete({ telegram_id: String(ctx.chat.id), board_id: Number(ctx.match[1]) });
    return '/ib/';
  },
});

confirmRemoveIgnoredBoardMenu.interact('No, go back!', 'no', {
  do: async () => `..`,
});

async function getIgnoredBoard(telegramId: string, boardId: number) {
  const ignoredBoardsRepository = getRepository(IgnoredBoard);
  const ignoredBoard = await ignoredBoardsRepository.findOne(
    {
      telegram_id: telegramId,
      board_id: boardId,
    },
    { relations: ['board'] },
  );
  return ignoredBoard;
}

const ignoredBoardInfoMenu = new MenuTemplate<IMenuContext>(async (ctx) => {
  const ignoredBoard = await getIgnoredBoard(String(ctx.chat.id), Number(ctx.match[1]));

  let message = '';
  message += '<b>🗂️ Selected Ignored Board:</b>\n\n';
  message += `${ignoredBoard.board_id} - ${ignoredBoard.board.name}`;

  return {
    text: message,
    parse_mode: 'HTML',
  };
});

ignoredBoardInfoMenu.submenu('🗑️ Remove Board', 'remove', confirmRemoveIgnoredBoardMenu);

ignoredBoardInfoMenu.interact('↩ Go Back', 'back', {
  do: () => '..',
});

async function getIgnoredBoards(ctx: IMenuContext) {
  const ignoredBoardsRepository = getRepository(IgnoredBoard);
  const ignoredBoards = await ignoredBoardsRepository.find({
    where: { telegram_id: String(ctx.chat.id) },
    relations: ['board'],
  });

  const choices = {};

  for (const ignoredBoard of ignoredBoards) {
    choices[ignoredBoard.board_id] = `${ignoredBoard.board_id} - ${ignoredBoard.board.name}`;
  }

  return choices;
}

ignoredBoardsMenu.chooseIntoSubmenu('ib', getIgnoredBoards, ignoredBoardInfoMenu, {
  maxRows: 10,
  columns: 1,
  getCurrentPage: ctx => ctx.session.page,
  setPage: (ctx, page) => {
    ctx.session.page = page;
  },
  disableChoiceExistsCheck: true,
});

ignoredBoardsMenu.interact('✨ Add new', 'add', {
  do: async (ctx) => {
    await ctx.conversation.enter('addIgnoredBoard', { overwrite: true });
    return true;
  },
});

ignoredBoardsMenu.interact('↩ Go Back', 'back', {
  do: () => '..',
  joinLastRow: true,
});

export default ignoredBoardsMenu;
