/* eslint-disable no-await-in-loop */
import { Connection, MoreThan } from 'typeorm';
import { Client } from '@elastic/elasticsearch';
import RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import { container } from 'tsyringe';
import Topic from '##/modules/posts/infra/typeorm/entities/Topic';
import baseLogger from '##/shared/services/logger';

interface LastSyncState {
  lastUpdatedAt: string;
}

export class SyncTopicsPipeline {
  private readonly logger = baseLogger.child({ pipeline: 'syncTopicsPipeline' });

  private readonly INDEX_NAME = 'topics';

  private readonly INDEX_TEMPLATE_NAME = 'topics_template';

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
      await this.syncTopics();
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

  private async batchProcessTopics(topics: Topic[]): Promise<void> {
    const esBulkContent = topics.flatMap(topic => [
      { index: { _index: this.INDEX_NAME, _id: topic.topic_id.toString() } },
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

    const batchSize = Math.ceil(esBulkContent.length / 2 / this.INDEX_BATCH_SIZE);

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

  private async syncTopics(): Promise<void> {
    const topicsRepository = this.connection.getRepository(Topic);

    let { lastUpdatedAt } = (await this.cacheRepository.recover<LastSyncState>('topics-sync-state')) ?? {
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
        take: this.SYNC_BATCH_SIZE
      });

      if (topics.length) {
        await this.batchProcessTopics(topics);
        lastUpdatedAt = topics.at(-1).updated_at.toISOString();

        await this.cacheRepository.save('topics-sync-state', { lastUpdatedAt });
        this.logger.info(`Processed ${topics.length} topics. Last updated_at: ${lastUpdatedAt}`);
      }

      if (topics.length < this.SYNC_BATCH_SIZE) {
        this.logger.info('Synchronization is up to date');
        stop = true;
      }
    }
  }
}
