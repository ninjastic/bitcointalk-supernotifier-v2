/* eslint-disable no-await-in-loop */
import { Connection } from 'typeorm';
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
          board_id: {
            type: 'integer'
          },
          date: {
            type: 'date'
          },
          archive: {
            type: 'boolean'
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

async function batchProcessAddresses(addresses: any[]) {
  const esBulkContent = addresses.flatMap(address => [
    { index: { _index: INDEX_NAME, _id: `${address.address}_${address.post_id}` } },
    {
      id: address.posts_addresses_id,
      address: address.posts_addresses_address,
      coin: address.posts_addresses_coin,
      post_id: address.post_post_id,
      topic_id: address.post_topic_id,
      title: address.post_title,
      author: address.post_author,
      author_uid: address.post_author_uid,
      board_id: address.post_board_id,
      date: address.post_date,
      archive: address.post_archive,
      updated_at: new Date(address.updated_at).toISOString()
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

async function syncAddresses(connection: Connection) {
  const cacheRepository = container.resolve(RedisProvider);
  const addressesRepository = connection.getRepository(PostAddress);

  let { lastUpdatedAt } = (await cacheRepository.recover<LastSyncState>('posts-addresses-sync-state')) ?? {
    lastUpdatedAt: new Date(0).toISOString()
  };

  let stop = false;

  while (!stop) {
    const addresses = await addressesRepository
      .createQueryBuilder('posts_addresses')
      .select([
        'posts_addresses.id',
        'posts_addresses.address',
        'posts_addresses.coin',
        'posts_addresses.updated_at::text',
        'post.id as post_id',
        'post.topic_id as post_topic_id',
        'post.title as post_title',
        'post.author as post_author',
        'post.author_uid as post_author_uid',
        'post.board_id as post_board_id',
        'post.date as post_date',
        'post.archive as post_archive'
      ])
      .innerJoinAndSelect('posts_addresses.post', 'post')
      .where('posts_addresses.updated_at > :lastUpdatedAt', {
        lastUpdatedAt
      })
      .orderBy('posts_addresses.updated_at', 'ASC')
      .limit(SYNC_BATCH_SIZE)
      .getRawMany();

    if (addresses.length) {
      await batchProcessAddresses(addresses);
      lastUpdatedAt = addresses.at(-1).updated_at;

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
    logger.error({ error: error.message }, 'Error during synchronization');
  }
}
