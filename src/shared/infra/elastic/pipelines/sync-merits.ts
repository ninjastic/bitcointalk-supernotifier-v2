/* eslint-disable no-await-in-loop */
import type { Connection, ObjectLiteral } from 'typeorm';
import type { Client } from '@elastic/elasticsearch';
import Merit from '##/modules/merits/infra/typeorm/entities/Merit';
import type RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import baseLogger from '##/shared/services/logger';

type RawMerit = Merit & {
  post_title: string;
  post_board_id: number;
};

interface LastSyncState {
  lastUpdatedAt: string;
  lastDate: string;
}

interface PostDocMerit {
  id: string;
  amount: number;
  sender: string;
  sender_uid: number;
  receiver: string;
  receiver_uid: number;
  date: Date;
}

export class SyncMeritsPipeline {
  private readonly logger = baseLogger.child({ pipeline: 'syncMeritsPipeline' });

  private readonly INDEX_NAME = 'merits';

  private readonly POSTS_INDEX_NAME = 'posts_v3';

  private readonly INDEX_TEMPLATE_NAME = 'merits_template';

  private readonly SYNC_BATCH_SIZE = 10000;

  private readonly INDEX_BATCH_SIZE = 200;

  constructor(
    private readonly connection: Connection,
    private readonly esClient: Client,
    private readonly cacheRepository: RedisProvider
  ) {}

  public async execute(bootstrap?: boolean): Promise<{ lastUpdatedAt: string; lastDate: string }> {
    try {
      await this.setupElasticsearchTemplate();
      await this.createOrUpdateIndex();
      return this.syncMerits(bootstrap);
    } catch (error) {
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
            normalizer: {
              lowercase_normalizer: {
                type: 'custom',
                filter: ['lowercase']
              }
            }
          }
        },
        mappings: {
          properties: {
            id: {
              type: 'keyword'
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
              type: 'keyword',
              fields: {
                lowercase: {
                  type: 'keyword',
                  normalizer: 'lowercase_normalizer'
                }
              }
            },
            receiver_uid: { type: 'integer' },
            sender: {
              type: 'keyword',
              fields: {
                lowercase: {
                  type: 'keyword',
                  normalizer: 'lowercase_normalizer'
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
      this.logger.debug(`Elasticsearch template '${this.INDEX_TEMPLATE_NAME}' created or updated successfully.`);
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
        this.logger.debug(`Index '${this.INDEX_NAME}' created successfully.`);
      } else {
        this.logger.debug(`Index '${this.INDEX_NAME}' already exists.`);
      }
    } catch (error) {
      this.logger.error({ error }, 'Error creating or checking index');
      throw error;
    }
  }

  private async batchProcessMerit(merits: RawMerit[]): Promise<void> {
    let bulkOperations: any[] = [];
    const postsToUpdateMap = new Map<number, PostDocMerit[]>();

    for (const merit of merits) {
      const updateOperationInfo = { update: { _index: this.INDEX_NAME, _id: merit.id } };
      const updateOperationContent = {
        doc: {
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
        },
        doc_as_upsert: true
      };

      bulkOperations.push(updateOperationInfo, updateOperationContent);
    }

    const meritUpdateOrIndexBulkChunks: any[] = [];
    for (let i = 0; i < bulkOperations.length; i += this.INDEX_BATCH_SIZE * 2) {
      const operations = bulkOperations.slice(i, i + this.INDEX_BATCH_SIZE * 2);
      meritUpdateOrIndexBulkChunks.push(this.esClient.bulk({ operations, refresh: false }));
    }

    for (const merit of merits) {
      const newMerit = {
        id: merit.id,
        amount: merit.amount,
        sender: merit.sender,
        sender_uid: merit.sender_uid,
        receiver: merit.receiver,
        receiver_uid: merit.receiver_uid,
        date: merit.date
      };
      postsToUpdateMap.set(merit.post_id, [...(postsToUpdateMap.get(merit.post_id) ?? []), newMerit]);
    }

    bulkOperations = [];

    for (const [postId, newMerits] of postsToUpdateMap.entries()) {
      const updateOperationInfo = { update: { _index: this.POSTS_INDEX_NAME, _id: postId.toString() } };
      const updateOperationContent = {
        script: {
          source: `
            if (ctx._source.merits == null) { 
              ctx._source.merits = params.newMerits; 
            } else { 
              def existingMeritIds = new HashSet(ctx._source.merits.stream().map(m -> m.id).collect(Collectors.toList()));
              for (newMerit in params.newMerits) { 
                if (!existingMeritIds.contains(newMerit.id)) { 
                  ctx._source.merits.add(newMerit); 
                } 
              } 
            }
            int sum = 0;
            if (ctx._source.merits != null && ctx._source.merits.size() > 0) {
              for (merit in ctx._source.merits) {
                sum += merit.amount;
              }
              ctx._source.merits_sum = sum;
            }
          `,
          lang: 'painless',
          params: { newMerits }
        }
      };

      bulkOperations.push(updateOperationInfo, updateOperationContent);
    }

    const postUpdateWithMeritsBulkChunks: any[] = [];
    for (let i = 0; i < bulkOperations.length; i += this.INDEX_BATCH_SIZE * 2) {
      const operations = bulkOperations.slice(i, i + this.INDEX_BATCH_SIZE * 2);
      postUpdateWithMeritsBulkChunks.push(this.esClient.bulk({ operations, refresh: false }));
    }

    const results = await Promise.all([...meritUpdateOrIndexBulkChunks, ...postUpdateWithMeritsBulkChunks]);

    if (results.some(result => result.errors)) {
      const erroredItems = results
        .flatMap(result => result.items)
        .filter(item => item.update?.error)
        .map(item => ({
          id: item.update._id,
          error: item.update.error,
          status: item.update.status
        }));

      this.logger.error({ errored: erroredItems }, 'Update errored');
      throw new Error('Update errored');
    }
  }

  private async getMeritsToSync(type: 'updated_at' | 'date', last: string): Promise<any[]> {
    const meritsRepository = this.connection.getRepository(Merit);

    let where: [string, ObjectLiteral] = ['', {}];
    let orderBy: [string, 'ASC' | 'DESC'] = ['', 'ASC'];

    if (type === 'updated_at') {
      where = ['merits.updated_at > :lastUpdatedAt', { lastUpdatedAt: last }];
      orderBy = ['merits.updated_at', 'ASC'];
    } else if (type === 'date') {
      where = ['merits.date > :lastDate', { lastDate: last }];
      orderBy = ['merits.date', 'ASC'];
    }

    const merits = await meritsRepository
      .createQueryBuilder('merits')
      .select([
        'merits.*',
        'merits.updated_at::text',
        'posts.post_id',
        'posts.title as post_title',
        'posts.board_id as post_board_id'
      ])
      .where(where[0], where[1])
      .innerJoinAndSelect('merits.post', 'posts')
      .orderBy(orderBy[0], orderBy[1])
      .limit(this.SYNC_BATCH_SIZE)
      .getRawMany();

    return merits;
  }

  private async syncMerits(bootstrap?: boolean): Promise<{ lastUpdatedAt: string; lastDate: string }> {
    let lastUpdatedAt: string;
    let lastDate: string;

    if (bootstrap) {
      lastUpdatedAt = new Date(0).toISOString();
      lastDate = new Date(0).toISOString();
    } else {
      ({ lastUpdatedAt, lastDate } = (await this.cacheRepository.recover<LastSyncState>('syncState:merits')) ?? {
        lastUpdatedAt: new Date(0).toISOString(),
        lastDate: new Date(0).toISOString()
      });
    }

    const lastSync = bootstrap
      ? {
          type: 'date' as 'date' | 'updated_at',
          last: lastDate
        }
      : {
          type: 'updated_at' as 'date' | 'updated_at',
          last: lastUpdatedAt
        };

    let stop = false;
    let lastState = { lastUpdatedAt, lastDate };

    while (!stop) {
      const merits = await this.getMeritsToSync(lastSync.type, lastSync.last);

      if (merits.length) {
        await this.batchProcessMerit(merits);
        lastUpdatedAt = merits.at(-1).updated_at;
        lastDate = merits.at(-1).date;

        if (lastSync.type === 'updated_at') {
          lastSync.last = lastUpdatedAt;
        } else if (lastSync.type === 'date') {
          lastSync.last = lastDate;
        }

        if (!bootstrap) {
          await this.cacheRepository.save('syncState:merits', { lastUpdatedAt, lastDate });
        }

        this.logger.debug(
          `Processed ${merits.length} merits. Last updated_at: ${lastUpdatedAt} | Last date: ${lastDate}`
        );
      }

      if (merits.length < this.SYNC_BATCH_SIZE) {
        lastState = { lastUpdatedAt, lastDate };

        this.logger.debug('Synchronization is up to date');
        stop = true;
      }
    }

    return lastState;
  }
}
