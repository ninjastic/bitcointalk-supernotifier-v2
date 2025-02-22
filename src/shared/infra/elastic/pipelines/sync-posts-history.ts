/* eslint-disable no-await-in-loop */
import { Connection, MoreThan } from 'typeorm';
import { Client } from '@elastic/elasticsearch';
import RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import PostHistory from '##/modules/posts/infra/typeorm/entities/PostHistory';
import baseLogger from '##/shared/services/logger';

interface LastSyncState {
  lastUpdatedAt: string;
}

export class SyncPostsHistoryPipeline {
  private readonly logger = baseLogger.child({ pipeline: 'syncPostsHistoryPipeline' });

  private readonly INDEX_NAME = 'posts_history';

  private readonly INDEX_TEMPLATE_NAME = 'posts_history_template';

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
      await this.syncHistory();
    } catch (error) {
      this.logger.error({ error }, 'Error during synchronization');
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

  private async batchProcessHistory(histories: PostHistory[]): Promise<void> {
    const esBulkContent = histories.flatMap(history => [
      { index: { _index: this.INDEX_NAME, _id: history.id } },
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

  private async syncHistory(): Promise<void> {
    const historyRepository = this.connection.getRepository(PostHistory);

    let { lastUpdatedAt } = (await this.cacheRepository.recover<LastSyncState>('posts-history-sync-state')) ?? {
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
        take: this.SYNC_BATCH_SIZE
      });

      if (histories.length) {
        await this.batchProcessHistory(histories);
        lastUpdatedAt = histories.at(-1).updated_at.toISOString();

        await this.cacheRepository.save('posts-history-sync-state', { lastUpdatedAt });
        this.logger.info(`Processed ${histories.length} history records. Last updated_at: ${lastUpdatedAt}`);
      }

      if (histories.length < this.SYNC_BATCH_SIZE) {
        this.logger.info('Synchronization is up to date');
        stop = true;
      }
    }
  }
}
