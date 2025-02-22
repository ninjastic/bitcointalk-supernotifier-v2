/* eslint-disable no-await-in-loop */
import { Connection } from 'typeorm';
import { Client } from '@elastic/elasticsearch';
import RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import PostAddress from '##/modules/posts/infra/typeorm/entities/PostAddress';
import baseLogger from '##/shared/services/logger';

interface LastSyncState {
  lastUpdatedAt: string;
}

export class SyncPostsAddressesPipeline {
  private readonly logger = baseLogger.child({ pipeline: 'syncPostsAddressesPipeline' });

  private readonly INDEX_NAME = 'posts_addresses';

  private readonly INDEX_TEMPLATE_NAME = 'posts_addresses_template';

  private readonly SYNC_BATCH_SIZE = 30000;

  private readonly INDEX_BATCH_SIZE = 10;

  constructor(
    private readonly connection: Connection,
    private readonly esClient: Client,
    private readonly cacheRepository: RedisProvider
  ) {}

  public async execute(): Promise<void> {
    try {
      await this.setupElasticsearchTemplate();
      await this.createOrUpdateIndex();
      await this.syncAddresses();
    } catch (error) {
      this.logger.error({ error: error.message }, 'Error during synchronization');
    }
  }

  private async setupElasticsearchTemplate(): Promise<void> {
    try {
      await this.esClient.indices.putTemplate({
        name: this.INDEX_TEMPLATE_NAME,
        index_patterns: [this.INDEX_NAME],
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
      this.logger.info(`Elasticsearch template '${this.INDEX_TEMPLATE_NAME}' created or updated successfully.`);
    } catch (error) {
      this.logger.error({ error }, 'Error creating Elasticsearch template');
      throw error;
    }
  }

  private async createOrUpdateIndex(): Promise<void> {
    try {
      const indexExists = await this.esClient.indices.exists({ index: this.INDEX_NAME });

      if (!indexExists.valueOf()) {
        await this.esClient.indices.create({
          index: this.INDEX_NAME
        });
        this.logger.info(`Index '${this.INDEX_NAME}' created successfully.`);
      } else {
        this.logger.info(`Index '${this.INDEX_NAME}' already exists.`);
      }
    } catch (error) {
      this.logger.error({ error }, 'Error creating or checking index');
      throw error;
    }
  }

  private async batchProcessAddresses(addresses: any[]): Promise<void> {
    const esBulkContent = addresses.flatMap(address => [
      { index: { _index: this.INDEX_NAME, _id: `${address.address}_${address.post_id}` } },
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

    const batchSize = Math.ceil(esBulkContent.length / this.INDEX_BATCH_SIZE);

    const bulkPromises = [];
    for (let i = 0; i < esBulkContent.length; i += batchSize * 2) {
      bulkPromises.push(this.esClient.bulk({ operations: esBulkContent.slice(i, i + batchSize * 2), refresh: false }));
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

      this.logger.error({ errored: erroredItems }, 'Index errored');
      throw new Error('Index errored');
    }
  }

  private async syncAddresses(): Promise<void> {
    const addressesRepository = this.connection.getRepository(PostAddress);

    let { lastUpdatedAt } = (await this.cacheRepository.recover<LastSyncState>('posts-addresses-sync-state')) ?? {
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
        .limit(this.SYNC_BATCH_SIZE)
        .getRawMany();

      if (addresses.length) {
        await this.batchProcessAddresses(addresses);
        lastUpdatedAt = addresses.at(-1).updated_at;

        await this.cacheRepository.save('posts-addresses-sync-state', { lastUpdatedAt });
        this.logger.info(`Processed ${addresses.length} addresses. Last updated_at: ${lastUpdatedAt}`);
      }

      if (addresses.length < this.SYNC_BATCH_SIZE) {
        this.logger.info('Synchronization is up to date');
        stop = true;
      }
    }
  }
}
