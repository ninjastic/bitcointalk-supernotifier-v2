/* eslint-disable no-await-in-loop */
import { Connection } from 'typeorm';
import esClient from 'shared/services/elastic';
import baseLogger from '##/shared/services/logger';
import Board from '##/modules/posts/infra/typeorm/entities/Board';

const logger = baseLogger.child({ pipeline: 'syncBoardsPipeline' });

const INDEX_NAME = 'boards';
const INDEX_TEMPLATE_NAME = 'boards_template';

async function setupElasticsearchTemplate() {
  try {
    await esClient.indices.putTemplate({
      name: INDEX_TEMPLATE_NAME,
      index_patterns: [INDEX_NAME],
      settings: {},
      mappings: {
        properties: {
          board_id: { type: 'integer' },
          name: {
            type: 'text',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          parent_id: { type: 'integer' }
        }
      }
    });
    logger.info(`Elasticsearch template '${INDEX_TEMPLATE_NAME}' created or updated successfully.`);
  } catch (error) {
    logger.error({ error }, 'Error creating Elasticsearch template');
    throw error;
  }
}

async function createOrUpdateIndex() {
  try {
    const indexExists = await esClient.indices.exists({ index: INDEX_NAME });

    if (!indexExists.valueOf()) {
      await esClient.indices.create({
        index: INDEX_NAME
      });
      logger.info(`Index '${INDEX_NAME}' created successfully.`);
    } else {
      logger.info(`Index '${INDEX_NAME}' already exists.`);
    }
  } catch (error) {
    logger.error({ error }, 'Error creating or checking index');
    throw error;
  }
}

async function batchProcessBoard(boards: Board[]) {
  const esBulkContent = boards.flatMap(board => [
    { index: { _index: INDEX_NAME, _id: board.board_id.toString() } },
    {
      board_id: board.board_id,
      name: board.name,
      parent_id: board.parent_id
    }
  ]);

  const results = await esClient.bulk({ operations: esBulkContent, refresh: false });

  if (results.errors) {
    const erroredItems = results.items
      .filter(item => item.index.error || item.create?.error || item.update?.error || item.delete?.error)
      .map(item => ({
        id: item.index._id,
        error: item.index.error || item.create?.error || item.update?.error || item.delete?.error,
        status: item.index.status
      }));

    logger.error({ errored: erroredItems }, 'Index errored');
    throw new Error('Index errored');
  }
}

async function syncBoards(connection: Connection) {
  const boardRepository = connection.getRepository(Board);

  const boards = await boardRepository.createQueryBuilder('boards').orderBy('boards.board_id', 'ASC').getMany();

  if (boards.length) {
    await batchProcessBoard(boards);

    logger.info(`Processed ${boards.length} boards.`);
  }
}

export async function syncBoardsPipeline(connection: Connection) {
  try {
    await setupElasticsearchTemplate();
    await createOrUpdateIndex();

    await syncBoards(connection);
  } catch (error) {
    logger.error({ error }, 'Error during synchronization');
  }
}
