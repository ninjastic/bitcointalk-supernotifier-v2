/* eslint-disable no-await-in-loop */
import { Connection } from 'typeorm';
import esClient from 'shared/services/elastic';
import Merit from '##/modules/merits/infra/typeorm/entities/Merit';
import RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import { container } from 'tsyringe';
import baseLogger from '##/shared/services/logger';

const logger = baseLogger.child({ pipeline: 'syncMeritsPipeline' });

const INDEX_NAME = 'merits';
const INDEX_TEMPLATE_NAME = 'merits_template';
const SYNC_BATCH_SIZE = 30000;
const INDEX_BATCHES = 10;

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
          amount: {
            type: 'integer'
          },
          post_id: {
            type: 'integer'
          },
          topic_id: {
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
          receiver: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256
              }
            }
          },
          receiver_uid: {
            type: 'integer'
          },
          sender: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256
              }
            }
          },
          sender_uid: {
            type: 'integer'
          },
          board_id: {
            type: 'integer'
          },
          date: {
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

async function batchProcessMerit(merits: Merit[]) {
  const esBulkContent = merits.flatMap(merit => [
    { index: { _index: INDEX_NAME, _id: merit.id.toString() } },
    {
      amount: merit.amount,
      post_id: merit.post_id,
      topic_id: merit.topic_id,
      title: merit.post.title,
      receiver: merit.receiver,
      receiver_uid: merit.receiver_uid,
      sender: merit.sender,
      sender_uid: merit.sender_uid,
      board_id: merit.post.board_id,
      date: merit.date,
      updated_at: merit.updated_at
    }
  ]);

  const batchSize = Math.ceil(esBulkContent.length / 2 / INDEX_BATCHES);

  const bulkPromises = [];
  for (let i = 0; i < esBulkContent.length; i += batchSize * 2) {
    bulkPromises.push(esClient.bulk({ operations: esBulkContent.slice(i, i + batchSize * 2), refresh: false }));
  }

  await Promise.all(bulkPromises);
}

async function syncMerits(connection: Connection) {
  const cacheRepository = container.resolve(RedisProvider);
  const meritsRepository = connection.getRepository(Merit);

  let { lastUpdatedAt } = (await cacheRepository.recover<LastSyncState>('merits-sync-state')) ?? {
    lastUpdatedAt: new Date(0).toISOString()
  };

  let stop = false;

  while (!stop) {
    const merits = await meritsRepository
      .createQueryBuilder('merit')
      .select(['*', 'merit.updated_at::text'])
      .where('merit.updated_at > :lastUpdatedAt', {
        lastUpdatedAt
      })
      .innerJoinAndSelect('merit.post', 'post')
      .orderBy('merit.updated_at', 'ASC')
      .limit(SYNC_BATCH_SIZE)
      .getRawMany();

    if (merits.length) {
      await batchProcessMerit(merits);
      lastUpdatedAt = merits.at(-1).updated_at;
    }

    await cacheRepository.save('merits-sync-state', { lastUpdatedAt });
    logger.info(`Processed ${merits.length} merits. Last updated_at: ${lastUpdatedAt}`);

    if (merits.length < SYNC_BATCH_SIZE) {
      logger.info('Synchronization is up to date');
      stop = true;
    }
  }
}

export async function syncMeritsPipeline(connection: Connection) {
  try {
    await setupElasticsearchTemplate();
    await createOrUpdateIndex();

    await syncMerits(connection);
  } catch (error) {
    logger.error({ error }, 'Error during synchronization');
  }
}
