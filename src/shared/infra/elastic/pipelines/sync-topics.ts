import type { Client } from '@elastic/elasticsearch';
import type RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import type { Connection } from 'typeorm';

import Topic from '##/modules/posts/infra/typeorm/entities/Topic';
import baseLogger from '##/shared/services/logger';

type RawTopic = Topic & {
  posts_title: string;
  posts_author: string;
  posts_author_uid: number;
  posts_board_id: number;
  posts_date: Date;
  posts_created_at: Date;
  posts_updated_at: string;
};

interface LastSyncState {
  lastUpdatedAt: string;
}

export class SyncTopicsPipeline {
  private readonly logger = baseLogger.child({ pipeline: 'syncTopicsPipeline' });

  private readonly INDEX_NAME = 'topics_v2';

  private readonly POSTS_INDEX_NAME = 'posts_v3';

  private readonly INDEX_TEMPLATE_NAME = 'topics_template';

  private readonly SYNC_BATCH_SIZE = 10000;

  private readonly INDEX_BATCH_SIZE = 10;

  constructor(
    private readonly connection: Connection,
    private readonly esClient: Client,
    private readonly cacheRepository: RedisProvider,
  ) {}

  public async execute(): Promise<void> {
    try {
      await this.setupElasticsearchTemplate();
      await this.createOrUpdateIndex();
      await this.syncTopics();
    }
    catch (error) {
      this.logger.error({ error }, 'Error during synchronization');
    }
  }

  private async setupElasticsearchTemplate(): Promise<void> {
    try {
      await this.esClient.indices.putTemplate({
        name: this.INDEX_TEMPLATE_NAME,
        index_patterns: [this.INDEX_NAME],
        settings: {
          analysis: {
            analyzer: {
              autocomplete_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'autocomplete_filter'],
              },
              autocomplete_search_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase'],
              },
            },
            filter: {
              autocomplete_filter: {
                type: 'edge_ngram',
                min_gram: 2,
                max_gram: 20,
              },
            },
          },
        },
        mappings: {
          properties: {
            topic_id: {
              type: 'integer',
            },
            post_id: {
              type: 'integer',
            },
            post: {
              properties: {
                title: {
                  type: 'text',
                  analyzer: 'autocomplete_analyzer',
                  search_analyzer: 'autocomplete_search_analyzer',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256,
                    },
                  },
                },
                author: {
                  type: 'keyword',
                },
                author_uid: {
                  type: 'integer',
                },
                date: {
                  type: 'date',
                },
                board_id: { type: 'integer' },
                created_at: { type: 'date' },
                updated_at: { type: 'date' },
              },
            },
            created_at: {
              type: 'date',
            },
            updated_at: {
              type: 'date',
            },
          },
        },
      });
      this.logger.debug(`Elasticsearch template '${this.INDEX_TEMPLATE_NAME}' created or updated successfully.`);
    }
    catch (error) {
      this.logger.error({ error }, 'Error creating Elasticsearch template');
      throw error;
    }
  }

  private async createOrUpdateIndex(): Promise<void> {
    try {
      const indexExists = await this.esClient.indices.exists({ index: this.INDEX_NAME });

      if (!indexExists.valueOf()) {
        await this.esClient.indices.create({
          index: this.INDEX_NAME,
        });
        this.logger.debug(`Index '${this.INDEX_NAME}' created successfully.`);
      }
      else {
        this.logger.debug(`Index '${this.INDEX_NAME}' already exists.`);
      }
    }
    catch (error) {
      this.logger.error({ error }, 'Error creating or checking index');
      throw error;
    }
  }

  private async batchProcessTopics(topics: RawTopic[]): Promise<void> {
    let bulkOperations: any[] = [];

    for (const topic of topics) {
      const operationInfo = { index: { _index: this.INDEX_NAME, _id: topic.topic_id.toString() } };
      const operationContent = {
        topic_id: topic.topic_id,
        post_id: topic.post_id,
        post: {
          title: topic.posts_title,
          author: topic.posts_author,
          author_uid: topic.posts_author_uid,
          date: topic.posts_date,
          board_id: topic.posts_board_id,
          created_at: topic.posts_created_at,
          updated_at: topic.posts_updated_at,
        },
      };

      bulkOperations.push(operationInfo, operationContent);
    }

    const indexTopicsBulkChunks = [];
    for (let i = 0; i < bulkOperations.length; i += this.INDEX_BATCH_SIZE * 2) {
      const operations = bulkOperations.slice(i, i + this.INDEX_BATCH_SIZE * 2);
      indexTopicsBulkChunks.push(this.esClient.bulk({ operations, refresh: false }));
    }

    bulkOperations = [];

    for (const topic of topics) {
      const operationInfo = { update: { _index: this.POSTS_INDEX_NAME, _id: topic.post_id.toString() } };
      const operationContent = {
        doc: { is_topic_starter: true },
      };

      bulkOperations.push(operationInfo, operationContent);
    }

    const updatePostsWithTopicStarterFieldBulkChunks = [];
    for (let i = 0; i < bulkOperations.length; i += this.INDEX_BATCH_SIZE * 2) {
      const operations = bulkOperations.slice(i, i + this.INDEX_BATCH_SIZE * 2);
      updatePostsWithTopicStarterFieldBulkChunks.push(this.esClient.bulk({ operations, refresh: false }));
    }

    const results = await Promise.all([...indexTopicsBulkChunks, ...updatePostsWithTopicStarterFieldBulkChunks]);

    if (results.some(result => result.errors)) {
      const erroredItems = results
        .flatMap(result => result.items)
        .filter(item => item.index?.error || item.update?.error)
        .map(item => ({
          id: item.index?._id || item.index?._id,
          error: item.index?.error || item.update?.error,
          status: item.index?.status || item.update?.status,
        }));

      this.logger.error({ errored: erroredItems }, 'Index or index errored');
      throw new Error('Update or index errored errored');
    }
  }

  private async syncTopics(): Promise<void> {
    const topicsRepository = this.connection.getRepository(Topic);

    let { lastUpdatedAt } = (await this.cacheRepository.recover<LastSyncState>('topics-sync-state')) ?? {
      lastUpdatedAt: new Date(0).toISOString(),
    };

    let stop = false;

    while (!stop) {
      const topics = await topicsRepository
        .createQueryBuilder('topics')
        .select(['topics.*', 'topics.updated_at::text'])
        .where('topics.updated_at > :lastUpdatedAt', { lastUpdatedAt })
        .innerJoinAndSelect('topics.post', 'posts')
        .orderBy('topics.updated_at', 'ASC')
        .limit(this.SYNC_BATCH_SIZE)
        .getRawMany();

      if (topics.length) {
        await this.batchProcessTopics(topics);
        lastUpdatedAt = topics.at(-1).updated_at;

        await this.cacheRepository.save('topics-sync-state', { lastUpdatedAt });
        this.logger.debug(`Processed ${topics.length} topics. Last updated_at: ${lastUpdatedAt}`);
      }

      if (topics.length < this.SYNC_BATCH_SIZE) {
        this.logger.debug('Synchronization is up to date');
        stop = true;
      }
    }
  }
}
