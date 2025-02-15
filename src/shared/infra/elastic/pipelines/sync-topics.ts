/* eslint-disable no-await-in-loop */
import { Connection, MoreThan } from 'typeorm';
import esClient from 'shared/services/elastic';
import RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import { container } from 'tsyringe';
import Topic from '##/modules/posts/infra/typeorm/entities/Topic';
import baseLogger from '##/shared/services/logger';

const logger = baseLogger.child({ pipeline: 'syncTopicsPipeline' });

const INDEX_NAME = 'topics';
const INDEX_TEMPLATE_NAME = 'topics_template';
const SYNC_BATCH_SIZE = 30000;
const INDEX_BATCH_SIZE = 10;

async function setupElasticsearchTemplate() {
  try {
    await esClient.indices.putTemplate({
      name: INDEX_TEMPLATE_NAME,
      index_patterns: [INDEX_NAME],
      mappings: {
        properties: {
          topic_id: {
            type: 'integer'
          },
          post_id: {
            type: 'integer'
          },
          post: {
            properties: {
              title: {
                type: 'text',
                fields: {
                  keyword: {
                    type: 'keyword',
                    ignore_above: 256
                  }
                }
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
              date: {
                type: 'date'
              },
              board_id: { type: 'integer' },
              created_at: { type: 'date' },
              updated_at: { type: 'date' }
            }
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
  lastPostId: number;
}

async function batchProcessTopics(topics: any[]) {
  const esBulkContent = topics.flatMap(topic => [
    { index: { _index: INDEX_NAME, _id: topic.topic_id.toString() } },
    {
      topic_id: topic.topic_id,
      post_id: topic.post_id,
      post: {
        title: topic.post.title,
        author: topic.post.author,
        author_uid: topic.post.author_uid,
        date: topic.post.date,
        board_id: topic.post.board_id,
        created_at: topic.created_at,
        updated_at: topic.updated_at
      }
    }
  ]);

  const batchSize = Math.ceil(esBulkContent.length / 2 / INDEX_BATCH_SIZE);

  const bulkPromises = [];
  for (let i = 0; i < esBulkContent.length; i += batchSize * 2) {
    bulkPromises.push(esClient.bulk({ operations: esBulkContent.slice(i, i + batchSize * 2), refresh: false }));
  }

  const results = await Promise.all(bulkPromises);
  if (results.some(result => result.errors)) {
    const erroredItems = results
      .flatMap(result => result.items)
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

async function syncTopics(connection: Connection) {
  const cacheRepository = container.resolve(RedisProvider);
  const topicsRepository = connection.getRepository(Topic);

  let { lastUpdatedAt } = (await cacheRepository.recover<LastSyncState>('topics-sync-state')) ?? {
    lastUpdatedAt: new Date(0).toISOString()
  };

  let stop = false;

  while (!stop) {
    const topics = await topicsRepository.find({
      where: { updated_at: MoreThan(lastUpdatedAt) },
      relations: ['post', 'post.board'],
      order: {
        updated_at: 'ASC'
      },
      take: SYNC_BATCH_SIZE
    });

    if (topics.length) {
      await batchProcessTopics(topics);
      lastUpdatedAt = topics.at(-1).updated_at.toISOString();

      await cacheRepository.save('topics-sync-state', { lastUpdatedAt });
      logger.info(`Processed ${topics.length} topics. Last updated_at: ${lastUpdatedAt}`);
    }

    if (topics.length < SYNC_BATCH_SIZE) {
      logger.info('Synchronization is up to date');
      stop = true;
    }
  }
}

export async function syncTopicsPipeline(connection: Connection) {
  try {
    await setupElasticsearchTemplate();
    await createOrUpdateIndex();

    await syncTopics(connection);
  } catch (error) {
    logger.error({ error }, 'Error during synchronization');
  }
}
