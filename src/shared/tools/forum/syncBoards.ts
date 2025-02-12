import 'dotenv/config';
import { load } from 'cheerio';
import { createConnection, createQueryBuilder } from 'typeorm';
import { container } from 'tsyringe';
import ora from 'ora';

import '../../container';

import api from '../../services/api';
import ICacheProvider from '../../container/providers/models/ICacheProvider';

const spinner = ora();

const requestBoardsUrl = async () => {
  spinner.text = 'Getting forum boards';
  const response = await api.get('/sitemap.php?t=b');
  const $ = load(response.data);

  const boards = $('loc');

  const boardIdRegEx = /board=(\d+)/;

  return boards.toArray().map(e => {
    const url = $(e).text();

    const id = Number(url.match(boardIdRegEx)[1]);

    return { id, url };
  });
};

const getExistentBoardsInDatabase = async (
  boards: Array<{
    id: number;
    url: string;
  }>
) => {
  spinner.text = 'Getting boards in database';
  const ids = boards.map(board => board.id);

  const results = await createQueryBuilder()
    .select('board_id')
    .from('boards', 'boards')
    .where('board_id = any(:board_ids)', {
      board_ids: ids
    })
    .getRawMany();

  return results;
};

const scrapeBoards = async (
  boards: Array<{
    id: number;
    url: string;
  }>
) => {
  for await (const board of boards) {
    spinner.text = `Scraping missing boards (${boards.length}) - ID ${board.id}`;
    const response = await api.get(board.url);

    const $ = load(response.data, { decodeEntities: true });

    const titleBoard = $('#bodyarea > div:nth-child(1) > div');
    const boardsList = $(titleBoard).find('b');

    const boardsArray = [];

    $(boardsList).each(async (boardIndex, boardElement) => {
      const boardName = $(boardElement).text();
      const boardLink = $(boardElement).find('a').attr('href');

      if (boardIndex !== 0) {
        const boardIdRegEx = /board=(\d+)/;

        const match = boardLink.match(boardIdRegEx);

        if (match) {
          boardsArray.push({ board_id: match[1], name: boardName });
        }
      }
    });

    const finalBoardsArray = [];

    if (boardsArray.length >= 2) {
      const baordsWithRelation = boardsArray.reverse().map((originalBoard, index) => ({
        id: () => 'uuid_generate_v4()',
        ...originalBoard,
        parent_id: boardsArray.reverse()[index + 1] ? boardsArray.reverse()[index + 1].board_id : null
      }));
      finalBoardsArray.push(...baordsWithRelation);
    } else {
      finalBoardsArray.push(...boardsArray);
    }

    if (finalBoardsArray.length) {
      await createQueryBuilder()
        .insert()
        .into('boards')
        .values(finalBoardsArray)
        .onConflict('("board_id") DO NOTHING')
        .execute();
    }
  }
};

export const syncBoards = async (): Promise<void> => {
  await createConnection();
  const cacheRepository = container.resolve<ICacheProvider>('CacheRepository');

  spinner.start();
  const boards = await requestBoardsUrl();

  const existent = await getExistentBoardsInDatabase(boards);

  const missingBoards = boards.filter(board => !existent.find(existentBoard => existentBoard.board_id === board.id));

  if (missingBoards.length) {
    await scrapeBoards(missingBoards);
    await cacheRepository.invalidateByPrefix('boards:*');
    spinner.succeed('Synced!');
  } else {
    spinner.succeed('Boards are already synced');
  }
};
