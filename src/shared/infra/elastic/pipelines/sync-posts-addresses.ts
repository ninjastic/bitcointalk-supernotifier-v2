/* eslint-disable no-await-in-loop */
import { Connection, MoreThan } from 'typeorm';
import esClient from 'shared/services/elastic';
import RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import { container } from 'tsyringe';
import PostAddress from '##/modules/posts/infra/typeorm/entities/PostAddress';
import baseLogger from '##/shared/services/logger';

const logger = baseLogger.child({ pipeline: 'syncPostsAddressesPipeline' });

const INDEX_NAME = 'posts_addresses';
const INDEX_TEMPLATE_NAME = 'posts_addresses_template';
const SYNC_BATCH_SIZE = 30000;
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
          address: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256
              }
            }
          },
          coin: {
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
          archive: {
            type: 'boolean'
          },
          address_created_at: {
            type: 'date'
          },
          address_updated_at: {
            type: 'date'
          },
          post_created_at: {
            type: 'date'
          },
          post_updated_at: {
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

async function batchProcessAddresses(addresses: any[]) {
  const esBulkContent = addresses.flatMap(address => [
    { index: { _index: INDEX_NAME, _id: `${address.address}_${address.post_id}` } },
    {
      id: address.id,
      address: address.address,
      coin: address.coin,
      post_id: address.post_id,
      topic_id: address.post.topic_id,
      title: address.post.title,
      author: address.post.author,
      author_uid: address.post.author_uid,
      content: address.post.content,
      board_id: address.post.board_id,
      date: address.post.date,
      archive: address.post.archive,
      address_created_at: address.created_at,
      address_updated_at: address.updated_at,
      post_created_at: address.post.created_at,
      post_updated_at: address.post.updated_at
    }
  ]);

  const batchSize = Math.ceil(esBulkContent.length / 2 / INDEX_BATCH_SIZE);

  const bulkPromises = [];
  for (let i = 0; i < esBulkContent.length; i += batchSize * 2) {
    bulkPromises.push(esClient.bulk({ operations: esBulkContent.slice(i, i + batchSize * 2), refresh: false }));
  }

  await Promise.all(bulkPromises);
}

async function syncAddresses(connection: Connection) {
  const cacheRepository = container.resolve(RedisProvider);
  const addressesRepository = connection.getRepository(PostAddress);

  let { lastUpdatedAt } = (await cacheRepository.recover<LastSyncState>('posts-addresses-sync-state')) ?? {
    lastUpdatedAt: new Date(0).toISOString()
  };

  let stop = false;

  while (!stop) {
    const addresses = await addressesRepository.find({
      where: { updated_at: MoreThan(lastUpdatedAt) },
      relations: ['post'],
      order: {
        updated_at: 'ASC'
      },
      take: SYNC_BATCH_SIZE
    });

    if (addresses.length) {
      await batchProcessAddresses(addresses);
      lastUpdatedAt = addresses.at(-1).updated_at.toISOString();

      await cacheRepository.save('posts-addresses-sync-state', { lastUpdatedAt });
      logger.info(`Processed ${addresses.length} addresses. Last updated_at: ${lastUpdatedAt}`);
    }

    if (addresses.length < SYNC_BATCH_SIZE) {
      logger.info('Synchronization is up to date');
      stop = true;
    }
  }
}

export async function syncPostsAddressesPipeline(connection: Connection) {
  try {
    await setupElasticsearchTemplate();
    await createOrUpdateIndex();

    await syncAddresses(connection);
  } catch (error) {
    logger.error({ error }, 'Error during synchronization');
  } finally {
    if (connection) await connection.close();
    await esClient.close();
  }
}
