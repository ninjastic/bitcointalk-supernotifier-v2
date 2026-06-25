import type { Conversation } from '@grammyjs/conversations';

import { Menu } from '@grammyjs/menu';
import { container } from 'tsyringe';

import type Board from '../../../../modules/posts/infra/typeorm/entities/Board';
import type IMenuContext from '../@types/IMenuContext';

import TrackedBoardsRepository from '../../../../modules/posts/infra/typeorm/repositories/TrackedBoardsRepository';
import GetBoardChildrensFromIdService from '../../../../modules/posts/services/GetBoardChildrensFromIdService';
import GetBoardsListService from '../../../../modules/posts/services/GetBoardsListService';
import { mainMenu } from '../menus/mainMenu';
import { mainMenuHtml, replyHtmlMenuFromConversation } from '../menus/menu-utils';
import trackedBoardsMenu from '../menus/trackedBoardsMenu';
import { TRACKED_BOARDS_MENU_HTML } from '../menus/trackedBoardsMenu';

export const confirmAddTrackedBoardInlineMenu = new Menu('tbc')
  .text({ text: 'Yes', payload: 'yes' })
  .row()
  .text({ text: 'Include children boards', payload: 'yes-childs' })
  .row()
  .text({ text: 'No', payload: 'no' });

export const cancelAddTrackedBoardPromptInlineMenu = new Menu('tbx').text({ text: 'Cancel' });

async function askForPrompt(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
): Promise<Board[] | null> {
  const getBoardsListService = new GetBoardsListService();
  const getBoardChildrensFromIdService = container.resolve(GetBoardChildrensFromIdService);

  const promptMessage = await ctx.reply('What is the ID or URL of the board you want to track?', {
    reply_markup: cancelAddTrackedBoardPromptInlineMenu,
  });

  while (true) {
    const { message, callbackQuery } = await conversation.wait();

    if (callbackQuery?.data.includes('tbx')) {
      await ctx.api.deleteMessage(ctx.chat.id, promptMessage.message_id);
      await replyHtmlMenuFromConversation(
        conversation,
        ctx,
        TRACKED_BOARDS_MENU_HTML,
        trackedBoardsMenu,
      );
      return null;
    }

    if (!message?.text) {
      continue;
    }

    const text = message.text;

    if (text === '/cancel' || text === '/menu') {
      await replyHtmlMenuFromConversation(conversation, ctx, mainMenuHtml, mainMenu);
      return null;
    }

    let boardId: number;

    if (text.startsWith('https://bitcointalk.org/index.php?board=')) {
      boardId = Number(text.match(/board=(\d+)/)[1]);
    } else if (!Number.isNaN(Number(text))) {
      boardId = Number(text);
    }

    const boards = await getBoardsListService.execute(true);
    const inputBoard = boards.find((_board) => _board.board_id === boardId);

    if (!inputBoard) {
      await ctx.reply("I couldn't find a board with this ID. Let's try again?");
      continue;
    }

    const boardWithChilds = await getBoardChildrensFromIdService.execute(inputBoard.board_id);

    let confirmMessage = `Do you want to add the board: <b>${inputBoard.name}</b>?`;

    if (boardWithChilds.length > 1) {
      confirmMessage += `\n\nIf you include its childrens, you will also track:\n`;
      confirmMessage += boardWithChilds
        .slice(1)
        .map((board) => `<b>${board.board_id} - ${board.name}</b>`)
        .join('\n');
    }

    await ctx.reply(confirmMessage, {
      parse_mode: 'HTML',
      reply_markup: confirmAddTrackedBoardInlineMenu,
    });

    const answerCb = await conversation.waitForCallbackQuery(/tbc/);

    if (answerCb.callbackQuery.data.match(/\/yes\//)) {
      await ctx.api.deleteMessage(ctx.chat.id, answerCb.callbackQuery.message.message_id);
      return [inputBoard];
    }
    if (answerCb.callbackQuery.data.match(/\/yes-childs\//)) {
      await ctx.api.deleteMessage(ctx.chat.id, answerCb.callbackQuery.message.message_id);
      return boardWithChilds;
    }

    await ctx.api.deleteMessage(ctx.chat.id, answerCb.callbackQuery.message.message_id);
  }
}

async function addTrackedBoardConversation(
  conversation: Conversation<IMenuContext, IMenuContext>,
  ctx: IMenuContext,
): Promise<void> {
  const trackedBoardsRepository = container.resolve(TrackedBoardsRepository);
  const newBoards = await askForPrompt(conversation, ctx);

  if (!newBoards) {
    return;
  }

  const userTrackedTopics = await trackedBoardsRepository.findByTelegramId(String(ctx.chat.id));

  const trackedBoardsToAdd = newBoards
    .map((board) =>
      trackedBoardsRepository.create({
        board_id: board.board_id,
        telegram_id: String(ctx.chat.id),
      }),
    )
    .filter(
      (boardToAdd) =>
        !userTrackedTopics.find(
          (userTrackedTopic) => userTrackedTopic.board_id === boardToAdd.board_id,
        ),
    );

  const insertedTrackedBoards = await conversation.external(async () =>
    trackedBoardsRepository.batchSave(trackedBoardsToAdd),
  );

  if (!insertedTrackedBoards.length) {
    await ctx.reply('You were already tracking these boards.');
  }

  await replyHtmlMenuFromConversation(
    conversation,
    ctx,
    TRACKED_BOARDS_MENU_HTML,
    trackedBoardsMenu,
  );
}

export default addTrackedBoardConversation;
