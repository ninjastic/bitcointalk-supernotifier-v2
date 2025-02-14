/* eslint-disable no-await-in-loop */
import { Connection, MoreThan } from 'typeorm';
import esClient from 'shared/services/elastic';
import RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import { container } from 'tsyringe';
import PostHistory from '##/modules/posts/infra/typeorm/entities/PostHistory';
import baseLogger from '##/shared/services/logger';

const logger = baseLogger.child({ pipeline: 'syncPostsHistoryPipeline' });

const INDEX_NAME = 'posts_history';
const INDEX_TEMPLATE_NAME = 'posts_history_template';
const SYNC_BATCH_SIZE = 50000;
const INDEX_BATCH_SIZE = 10;

async function setupElasticsearchTemplate() {
  try {
    await esClient.indices.putTemplate({
      name: INDEX_TEMPLATE_NAME,
      index_patterns: [INDEX_NAME],
      mappings: {
        properties: {
          id: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256
              }
            }
          },
          post_id: {
            type: 'integer'
          },
          topic_id: {
            type: 'integer'
          },
          author: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256
              }
            }
          },
          author_uid: {
            type: 'integer'
          },
          title: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256
              }
            }
          },
          content: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256
              }
            }
          },
          board_id: {
            type: 'integer'
          },
          date: {
            type: 'date'
          },
          version: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256
              }
            }
          },
          deleted: {
            type: 'boolean'
          },
          created_at: {
            type: 'date'
          },
          updated_at: {
            type: 'date'
          }
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

interface LastSyncState {
  lastUpdatedAt: string;
}

async function batchProcessHistory(histories: any[]) {
  const esBulkContent = histories.flatMap(history => [
    { index: { _index: INDEX_NAME, _id: history.id } },
    {
      id: history.id,
      post_id: history.post_id,
      topic_id: history.post.topic_id,
      author: history.post.author,
      author_uid: history.post.author_uid,
      title: history.title,
      content: history.content,
      board_id: history.board_id,
      date: history.date,
      version: history.version,
      deleted: history.deleted,
      created_at: history.created_at,
      updated_at: history.updated_at
    }
  ]);

  const batchSize = Math.ceil(esBulkContent.length / 2 / INDEX_BATCH_SIZE);

  const bulkPromises = [];
  for (let i = 0; i < esBulkContent.length; i += batchSize * 2) {
    bulkPromises.push(esClient.bulk({ operations: esBulkContent.slice(i, i + batchSize * 2), refresh: false }));
  }

  await Promise.all(bulkPromises);
}

async function syncHistory(connection: Connection) {
  const cacheRepository = container.resolve(RedisProvider);
  const historyRepository = connection.getRepository(PostHistory);

  let { lastUpdatedAt } = (await cacheRepository.recover<LastSyncState>('posts-history-sync-state')) ?? {
    lastUpdatedAt: new Date(0).toISOString()
  };

  let stop = false;

  while (!stop) {
    const histories = await historyRepository.find({
      where: { updated_at: MoreThan(lastUpdatedAt) },
      relations: ['post'],
      order: {
        updated_at: 'ASC'
      },
      take: SYNC_BATCH_SIZE
    });

    if (histories.length) {
      await batchProcessHistory(histories);
      lastUpdatedAt = histories.at(-1).updated_at.toISOString();

      await cacheRepository.save('posts-history-sync-state', { lastUpdatedAt });
      logger.info(`Processed ${histories.length} history records. Last updated_at: ${lastUpdatedAt}`);
    }

    if (histories.length < SYNC_BATCH_SIZE) {
      logger.info('Synchronization is up to date');
      stop = true;
    }
  }
}

export async function syncPostsHistoryPipeline(connection: Connection) {
  try {
    await setupElasticsearchTemplate();
    await createOrUpdateIndex();

    await syncHistory(connection);
  } catch (error) {
    logger.error({ error }, 'Error during synchronization');
  } finally {
    if (connection) await connection.close();
    await esClient.close();
  }
}
