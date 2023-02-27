import { container } from 'tsyringe';
import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Menu } from '@grammyjs/menu';
import { replyMenuToContext } from 'grammy-inline-menu';

import IMenuContext from '../@types/IMenuContext';
import { mainMenu } from '../menus/mainMenu';
import Board from '../../../../modules/posts/infra/typeorm/entities/Board';
import TrackedBoardsRepository from '../../../../modules/posts/infra/typeorm/repositories/TrackedBoardsRepository';
import GetBoardsListService from '../../../../modules/posts/services/GetBoardsListService';
import GetBoardChildrensFromIdService from '../../../../modules/posts/services/GetBoardChildrensFromIdService';
import trackedBoardsMenu from '../menus/trackedBoardsMenu';

export const confirmAddTrackedBoardInlineMenu = new Menu('addTrackedBoardConfirm')
  .text({ text: 'Yes', payload: 'yes' })
  .text({ text: 'Yes, include children boards', payload: 'yes-childs' })
  .row()
  .text({ text: 'No, try again', payload: 'no' });

export const cancelAddTrackedBoardPromptInlineMenu = new Menu('cancelAddTrackedBoard').text({ text: 'Cancel' });

const askForPrompt = async (
  conversation: Conversation<IMenuContext & ConversationFlavor>,
  ctx: IMenuContext
): Promise<Board[] | null> => {
  const getBoardsListService = container.resolve(GetBoardsListService);
  const getBoardChildrensFromIdService = container.resolve(GetBoardChildrensFromIdService);

  const promptMessage = await ctx.reply('What is the ID or URL of the board you want to track?', {
    reply_markup: cancelAddTrackedBoardPromptInlineMenu
  });

  const { message, callbackQuery } = await conversation.wait();

  if (callbackQuery?.data.includes('cancelAddTrackedBoard')) {
    await ctx.api.deleteMessage(ctx.from.id, promptMessage.message_id);
    await replyMenuToContext(mainMenu, ctx, '/tb/');
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
    await ctx.reply("I couldn't find a board with this ID.");
    await conversation.skip();
  }

  const boardWithChilds = await getBoardChildrensFromIdService.execute(inputBoard.board_id);

  let confirmMessage = `Do you want to add the board: <b>${inputBoard.name}</b>?`;

  if (boardWithChilds.length > 1) {
    confirmMessage += `\n\nIf you include its childrens, you will also track:\n`;
    confirmMessage += boardWithChilds
      .slice(1)
      .map(board => `<b>${board.board_id} - ${board.name}</b>`)
      .join('\n');
  }

  await ctx.reply(confirmMessage, {
    parse_mode: 'HTML',
    reply_markup: confirmAddTrackedBoardInlineMenu
  });

  const answerCb = await conversation.waitForCallbackQuery(/addTrackedBoardConfirm/);

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

const addTrackedBoardConversation = async (
  conversation: Conversation<IMenuContext & ConversationFlavor>,
  ctx: IMenuContext
): Promise<void> => {
  const trackedBoardsRepository = container.resolve(TrackedBoardsRepository);
  const newBoards = await askForPrompt(conversation, ctx);

  if (!newBoards) {
    return;
  }

  const userTrackedTopics = await trackedBoardsRepository.findByTelegramId(String(ctx.from.id));

  const trackedBoardsToAdd = newBoards
    .map(board =>
      trackedBoardsRepository.create({
        board_id: board.board_id,
        telegram_id: String(ctx.from.id)
      })
    )
    .filter(
      boardToAdd => !userTrackedTopics.find(userTrackedTopic => userTrackedTopic.board_id === boardToAdd.board_id)
    );

  const insertedTrackedBoards = await conversation.external(async () =>
    trackedBoardsRepository.batchSave(trackedBoardsToAdd)
  );

  if (insertedTrackedBoards.length) {
    const insertedBoardsText = insertedTrackedBoards
      .map(
        insertedTrackedBoard =>
          `<b>${newBoards.find(board => insertedTrackedBoard.board_id === board.board_id).name}</b>`
      )
      .join('\n');
    await ctx.reply(`You are now tracking the boards:\n\n${insertedBoardsText}`, { parse_mode: 'HTML' });
  } else {
    await ctx.reply('You were already tracking these boards.');
  }

  await replyMenuToContext(trackedBoardsMenu, ctx, '/tb/');
};

export default addTrackedBoardConversation;
