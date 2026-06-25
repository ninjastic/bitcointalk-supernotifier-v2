import type { Conversation } from '@grammyjs/conversations';

import { Menu } from '@grammyjs/menu';
import IgnoredBoard from '##/modules/posts/infra/typeorm/entities/IgnoredBoard';
import { container } from 'tsyringe';
import { getRepository } from 'typeorm';

import type Board from '../../../../modules/posts/infra/typeorm/entities/Board';
import type IMenuContext from '../@types/IMenuContext';

import GetBoardChildrensFromIdService from '../../../../modules/posts/services/GetBoardChildrensFromIdService';
import GetBoardsListService from '../../../../modules/posts/services/GetBoardsListService';
import ignoredBoardsMenu from '../menus/ignoredBoardsMenu';
import { IGNORED_BOARDS_MENU_HTML } from '../menus/ignoredBoardsMenu';
import { mainMenu } from '../menus/mainMenu';
import { mainMenuHtml, replyHtmlMenuFromConversation } from '../menus/menu-utils';

export const confirmAddIgnoredBoardInlineMenu = new Menu('ibc')
  .text({ text: 'Yes', payload: 'yes' })
  .row()
  .text({ text: 'Include children boards', payload: 'yes-childs' })
  .row()
  .text({ text: 'No', payload: 'no' });

export const cancelAddIgnoredBoardPromptInlineMenu = new Menu('ibx').text({ text: 'Cancel' });

async function askForPrompt(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
): Promise<Board[] | null> {
  const getBoardsListService = new GetBoardsListService();
  const getBoardChildrensFromIdService = container.resolve(GetBoardChildrensFromIdService);

  const promptMessage = await ctx.reply('What is the ID or URL of the board you want to ignore?', {
    reply_markup: cancelAddIgnoredBoardPromptInlineMenu,
  });

  const { message, callbackQuery } = await conversation.wait();

  if (callbackQuery?.data.includes('ibx')) {
    await ctx.api.deleteMessage(ctx.chat.id, promptMessage.message_id);
    await replyHtmlMenuFromConversation(
      conversation,
      ctx,
      IGNORED_BOARDS_MENU_HTML,
      ignoredBoardsMenu,
    );
    return null;
  }

  if (!message?.text) {
    await conversation.skip();
  }

  const { text } = message;

  let boardId: number;

  if (text === '/cancel' || text === '/menu') {
    await replyHtmlMenuFromConversation(conversation, ctx, mainMenuHtml, mainMenu);
    return null;
  }

  if (text.startsWith('https://bitcointalk.org/index.php?board=')) {
    boardId = Number(text.match(/board=(\d+)/)[1]);
  } else if (!Number.isNaN(Number(text))) {
    boardId = Number(text);
  }

  const boards = await getBoardsListService.execute(true);
  const inputBoard = boards.find((_board) => _board.board_id === boardId);

  if (!inputBoard) {
    await ctx.reply("I couldn't find a board with this ID. Let's try again?");
    await conversation.skip();
  }

  const boardWithChilds = await getBoardChildrensFromIdService.execute(inputBoard.board_id);

  let confirmMessage = `Do you want to add the board: <b>${inputBoard.name}</b>?`;

  if (boardWithChilds.length > 1) {
    confirmMessage += `\n\nIf you include its childrens, you will also ignore:\n`;
    confirmMessage += boardWithChilds
      .slice(1)
      .map((board) => `<b>${board.board_id} - ${board.name}</b>`)
      .join('\n');
  }

  await ctx.reply(confirmMessage, {
    parse_mode: 'HTML',
    reply_markup: confirmAddIgnoredBoardInlineMenu,
  });

  const answerCb = await conversation.waitForCallbackQuery(/ibc/);

  if (answerCb.callbackQuery.data.match(/\/yes\//)) {
    await ctx.api.deleteMessage(ctx.chat.id, answerCb.callbackQuery.message.message_id);
    return [inputBoard];
  }
  if (answerCb.callbackQuery.data.match(/\/yes-childs\//)) {
    await ctx.api.deleteMessage(ctx.chat.id, answerCb.callbackQuery.message.message_id);
    return boardWithChilds;
  }

  await ctx.api.deleteMessage(ctx.chat.id, answerCb.callbackQuery.message.message_id);
  return askForPrompt(conversation, ctx);
}

async function addIgnoredBoardConversation(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
): Promise<void> {
  const ignoredBoardsRepository = getRepository(IgnoredBoard);
  const newBoards = await askForPrompt(conversation, ctx);

  if (!newBoards) {
    return;
  }

  const userIgnoredBoards = await ignoredBoardsRepository.find({
    where: { telegram_id: String(ctx.chat.id) },
    relations: ['board'],
  });

  const ignoredBoardsToAdd = newBoards
    .map((board) =>
      ignoredBoardsRepository.create({
        board_id: board.board_id,
        telegram_id: String(ctx.chat.id),
      }),
    )
    .filter(
      (boardToAdd) =>
        !userIgnoredBoards.find(
          (userIgnoredBoard) => userIgnoredBoard.board_id === boardToAdd.board_id,
        ),
    );

  const insertedIgnoredBoards = await conversation.external(async () =>
    ignoredBoardsRepository.save(ignoredBoardsToAdd),
  );

  if (!insertedIgnoredBoards.length) {
    await ctx.reply('You were already ignoring these boards.');
  }

  await replyHtmlMenuFromConversation(
    conversation,
    ctx,
    IGNORED_BOARDS_MENU_HTML,
    ignoredBoardsMenu,
  );
}

export default addIgnoredBoardConversation;
