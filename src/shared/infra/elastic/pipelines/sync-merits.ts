/* eslint-disable no-await-in-loop */
import { Connection } from 'typeorm';
import { Client } from '@elastic/elasticsearch';
import Merit from '##/modules/merits/infra/typeorm/entities/Merit';
import RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import baseLogger from '##/shared/services/logger';

type RawMerit = Merit & {
  post_title: string;
  post_board_id: number;
};

interface LastSyncState {
  lastUpdatedAt: string;
}

export class SyncMeritsPipeline {
  private readonly logger = baseLogger.child({ pipeline: 'syncMeritsPipeline' });

  private readonly INDEX_NAME = 'merits';

  private readonly POSTS_INDEX_NAME = 'posts';

  private readonly INDEX_TEMPLATE_NAME = 'merits_template';

  private readonly SYNC_BATCH_SIZE = 30000;

  private readonly INDEX_BATCHES = 10;

  constructor(
    private readonly connection: Connection,
    private readonly esClient: Client,
    private readonly cacheRepository: RedisProvider
  ) {}

  public async execute(): Promise<void> {
    try {
      await this.setupElasticsearchTemplate();
      await this.createOrUpdateIndex();
      await this.syncMerits();
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
            amount: { type: 'integer' },
            post_id: { type: 'integer' },
            topic_id: { type: 'integer' },
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
            receiver_uid: { type: 'integer' },
            sender: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256
                }
              }
            },
            sender_uid: { type: 'integer' },
            board_id: { type: 'integer' },
            date: { type: 'date' },
            updated_at: { type: 'date' }
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

  private async batchProcessMerit(merits: RawMerit[]): Promise<void> {
    const esBulkContent: any[] = merits.flatMap(merit => [
      { index: { _index: this.INDEX_NAME, _id: merit.id } },
      {
        amount: merit.amount,
        post_id: merit.post_id,
        topic_id: merit.topic_id,
        title: merit.post_title,
        receiver: merit.receiver,
        receiver_uid: merit.receiver_uid,
        sender: merit.sender,
        sender_uid: merit.sender_uid,
        board_id: merit.post_board_id,
        date: merit.date,
        updated_at: new Date(merit.updated_at).toISOString()
      }
    ]);

    const postsToUpdate = new Map<number, string[]>();

    merits.forEach(merit => {
      postsToUpdate.set(merit.post_id, [...(postsToUpdate.get(merit.post_id) ?? []), merit.id]);
    });

    postsToUpdate.forEach((meritIds, postId) => {
      esBulkContent.push(
        {
          update: { _index: this.POSTS_INDEX_NAME, _id: postId.toString() }
        },
        {
          script: {
            source: `
              if (ctx._source.merit_ids == null) { 
                ctx._source.merit_ids = params.newMeritId; 
              } else { 
                for (merit in params.newMeritId) { 
                  if (!ctx._source.merit_ids.contains(merit)) { 
                    ctx._source.merit_ids.add(merit); 
                  } 
                } 
              }
            `,
            lang: 'painless',
            params: {
              newMeritId: meritIds
            }
          }
        }
      );
    });

    const batchSize = Math.ceil(esBulkContent.length / 2 / this.INDEX_BATCHES);

    const bulkPromises = [];
    for (let i = 0; i < esBulkContent.length; i += batchSize * 2) {
      bulkPromises.push(this.esClient.bulk({ operations: esBulkContent.slice(i, i + batchSize * 2), refresh: false }));
    }

    const results = await Promise.all(bulkPromises);
    if (results.some(result => result.errors)) {
      const erroredItems = results
        .flatMap(result => result.items)
        .filter(item => item.index?.error || item.create?.error || item.update?.error || item.delete?.error)
        .map(item => ({
          id: item.index?._id,
          error: item.index?.error || item.create?.error || item.update?.error || item.delete?.error,
          status: item.index?.status
        }));

      this.logger.error({ errored: erroredItems }, 'Index errored');
      throw new Error('Index errored');
    }
  }

  private async syncMerits(): Promise<void> {
    const meritsRepository = this.connection.getRepository(Merit);

    let { lastUpdatedAt } = (await this.cacheRepository.recover<LastSyncState>('merits-sync-state')) ?? {
      lastUpdatedAt: new Date(0).toISOString()
    };

    let stop = false;

    while (!stop) {
      const merits = await meritsRepository
        .createQueryBuilder('merits')
        .select([
          'merits.*',
          'merits.updated_at::text',
          'posts.post_id',
          'posts.title as post_title',
          'posts.board_id as post_board_id'
        ])
        .where('merits.updated_at > :lastUpdatedAt', {
          lastUpdatedAt
        })
        .innerJoinAndSelect('merits.post', 'posts')
        .orderBy('merits.updated_at', 'ASC')
        .limit(this.SYNC_BATCH_SIZE)
        .getRawMany();

      if (merits.length) {
        await this.batchProcessMerit(merits);
        lastUpdatedAt = merits.at(-1).updated_at;
      }

      await this.cacheRepository.save('merits-sync-state', { lastUpdatedAt });
      this.logger.info(`Processed ${merits.length} merits. Last updated_at: ${lastUpdatedAt}`);

      if (merits.length < this.SYNC_BATCH_SIZE) {
        this.logger.info('Synchronization is up to date');
        stop = true;
      }
    }
  }
}
