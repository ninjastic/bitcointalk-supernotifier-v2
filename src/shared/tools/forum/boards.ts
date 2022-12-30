import 'dotenv/config.js';
import cheerio from 'cheerio';
import { createQueryBuilder } from 'typeorm';
import { container } from 'tsyringe';

import '../../infra/typeorm';
import '../../container';

import api from '../../services/api';
import logger from '../../services/logger';
import ICacheProvider from '../../container/providers/models/ICacheProvider';

api.defaults.timeout = 10000;

const requestBoardsUrl = async () => {
  logger.info('Getting forum boards');
  const response = await api.get('/sitemap.php?t=b');
  const $ = cheerio.load(response.data);

  const boards = $('loc');

  const boardIdRegEx = new RegExp('board=(\\d+)');

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
  }>,
) => {
  logger.info('Getting boards in database');
  const ids = boards.map(board => {
    return board.id;
  });

  const results = await createQueryBuilder()
    .select('board_id')
    .from('boards', 'boards')
    .where('board_id = any(:board_ids)', {
      board_ids: ids,
    })
    .getRawMany();

  return results;
};

const scrapeBoards = async (
  boards: Array<{
    id: number;
    url: string;
  }>,
) => {
  logger.info(`Scraping missing boards (${boards.length})`);
  for await (const board of boards) {
    const response = await api.get(board.url);

    const $ = cheerio.load(response.data, { decodeEntities: true });

    const titleBoard = $('#bodyarea > div:nth-child(1) > div');
    const boardsList = $(titleBoard).find('b');

    const boardsArray = [];

    $(boardsList).each(async (boardIndex, boardElement) => {
      const boardName = $(boardElement).text();
      const boardLink = $(boardElement).find('a').attr('href');

      if (boardIndex !== 0) {
        const boardIdRegEx = new RegExp('board=(\\d+)');

        const match = boardLink.match(boardIdRegEx);

        if (match) {
          boardsArray.push({ board_id: match[1], name: boardName });
        }
      }
    });

    const finalBoardsArray = [];

    if (boardsArray.length >= 2) {
      const baordsWithRelation = boardsArray
        .reverse()
        .map((originalBoard, index) => {
          return {
            id: () => 'uuid_generate_v4()',
            ...originalBoard,
            parent_id: boardsArray.reverse()[index + 1]
              ? boardsArray.reverse()[index + 1].board_id
              : null,
          };
        });
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

(async () => {
  const cacheRepository = container.resolve<ICacheProvider>('CacheRepository');
  const boards = await requestBoardsUrl();

  const existent = await getExistentBoardsInDatabase(boards);

  const missingBoards = boards.filter(board => {
    return !existent.find(existentBoard => {
      return existentBoard.board_id === board.id;
    });
  });

  if (missingBoards.length) {
    await scrapeBoards(missingBoards);
    await cacheRepository.invalidateByPrefix('boards:*');
  } else {
    logger.info('No new boards to scrape');
  }
})();
