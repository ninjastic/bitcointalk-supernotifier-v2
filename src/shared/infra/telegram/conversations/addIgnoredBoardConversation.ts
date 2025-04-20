import { container } from 'tsyringe';
import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Menu } from '@grammyjs/menu';
import { replyMenuToContext } from 'grammy-inline-menu';

import IMenuContext from '../@types/IMenuContext';
import { mainMenu } from '../menus/mainMenu';
import Board from '../../../../modules/posts/infra/typeorm/entities/Board';
import GetBoardsListService from '../../../../modules/posts/services/GetBoardsListService';
import GetBoardChildrensFromIdService from '../../../../modules/posts/services/GetBoardChildrensFromIdService';
import ignoredBoardsMenu from '../menus/ignoredBoardsMenu';
import { getRepository } from 'typeorm';
import IgnoredBoard from '##/modules/posts/infra/typeorm/entities/IgnoredBoard';
  
export const confirmAddIgnoredBoardInlineMenu = new Menu('addIgnoredBoardConfirm')
  .text({ text: 'Yes', payload: 'yes' })
  .row()
  .text({ text: 'Include children boards', payload: 'yes-childs' })
  .row()
  .text({ text: 'No', payload: 'no' });

export const cancelAddIgnoredBoardPromptInlineMenu = new Menu('cancelAddIgnoredBoard').text({ text: 'Cancel' });

const askForPrompt = async (
  conversation: Conversation<IMenuContext & ConversationFlavor>,
  ctx: IMenuContext
): Promise<Board[] | null> => {
  const getBoardsListService = new GetBoardsListService();
  const getBoardChildrensFromIdService = container.resolve(GetBoardChildrensFromIdService);

  const promptMessage = await ctx.reply('What is the ID or URL of the board you want to ignore?', {
    reply_markup: cancelAddIgnoredBoardPromptInlineMenu
  });

  const { message, callbackQuery } = await conversation.wait();

  if (callbackQuery?.data.includes('cancelAddIgnoredBoard')) {
    await ctx.api.deleteMessage(ctx.chat.id, promptMessage.message_id);
    await replyMenuToContext(ignoredBoardsMenu, ctx, '/ib/');
    return null;
  }

  if (!message?.text) {
    await conversation.skip();
  }

  const { text } = message;

  let boardId: number;

  if (text === '/cancel' || text === '/menu') {
    await replyMenuToContext(mainMenu, ctx, '/');
    return null;
  }

  if (text.startsWith('https://bitcointalk.org/index.php?board=')) {
    boardId = Number(text.match(/board=(\d+)/)[1]);
  } else if (!Number.isNaN(Number(text))) {
    boardId = Number(text);
  }

  const boards = await getBoardsListService.execute(true);
  const inputBoard = boards.find(_board => _board.board_id === boardId);

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
      .map(board => `<b>${board.board_id} - ${board.name}</b>`)
      .join('\n');
  }

  await ctx.reply(confirmMessage, {
    parse_mode: 'HTML',
    reply_markup: confirmAddIgnoredBoardInlineMenu
  });

  const answerCb = await conversation.waitForCallbackQuery(/addIgnoredBoardConfirm/);

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
};

const addIgnoredBoardConversation = async (
  conversation: Conversation<IMenuContext & ConversationFlavor>,
  ctx: IMenuContext
): Promise<void> => {
  const ignoredBoardsRepository = getRepository(IgnoredBoard)
  const newBoards = await askForPrompt(conversation, ctx);

  if (!newBoards) {
    return;
  }

  const userIgnoredBoards = await ignoredBoardsRepository.find({ where: { telegram_id: String(ctx.chat.id) }, relations: ['board'] });

  const ignoredBoardsToAdd = newBoards
    .map(board =>
      ignoredBoardsRepository.create({
        board_id: board.board_id,
        telegram_id: String(ctx.chat.id)
      })
    )
    .filter(
      boardToAdd => !userIgnoredBoards.find(userIgnoredBoard => userIgnoredBoard.board_id === boardToAdd.board_id)
    );

  const insertedIgnoredBoards = await conversation.external(async () =>
    ignoredBoardsRepository.save(ignoredBoardsToAdd)
  );

  if (insertedIgnoredBoards.length) {
    const insertedBoardsText = insertedIgnoredBoards
      .map(
        insertedIgnoredBoard =>
          `<b>${newBoards.find(board => insertedIgnoredBoard.board_id === board.board_id).name}</b>`
      )
      .join('\n');
    await ctx.reply(`You are now ignoring the boards:\n\n${insertedBoardsText}`, { parse_mode: 'HTML' });
  } else {
    await ctx.reply('You were already ignoring these boards.');
  }

  await replyMenuToContext(ignoredBoardsMenu, ctx, '/ib/');
};

export default addIgnoredBoardConversation;
