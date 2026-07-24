import type { Client } from '@elastic/elasticsearch';
import type RedisProvider from '##/platform/cache/providers/implementations/RedisProvider';
import type { Connection } from 'typeorm';

import ModLog from '##/modules/modlog/infra/typeorm/entities/ModLog';
import baseLogger from '##/platform/logging/logger';

interface LastSyncState {
  lastUpdatedAt: string;
}

export class SyncModlogPipeline {
  private readonly logger = baseLogger.child({ pipeline: 'syncModlogPipeline' });

  private readonly INDEX_NAME = 'modlog';

  private readonly INDEX_TEMPLATE_NAME = 'modlog_template';

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
      await this.syncModlogs();
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
                  ignore_above: 256,
                },
              },
            },
            type: {
              type: 'keyword',
            },
            post_id: {
              type: 'integer',
            },
            topic_id: {
              type: 'integer',
            },
            user_id: {
              type: 'integer',
            },
            title: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
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
      this.logger.debug(
        `Elasticsearch template '${this.INDEX_TEMPLATE_NAME}' created or updated successfully.`,
      );
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
          index: this.INDEX_NAME,
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

  private async batchProcessModlogs(modlogs: ModLog[]): Promise<void> {
    const esBulkContent = modlogs.flatMap((modlog) => [
      { index: { _index: this.INDEX_NAME, _id: modlog.id } },
      {
        id: modlog.id,
        type: modlog.type,
        post_id: modlog.post_id,
        topic_id: modlog.topic_id,
        user_id: modlog.user_id,
        title: modlog.title,
        created_at: new Date(modlog.created_at).toISOString(),
        updated_at: new Date(modlog.updated_at).toISOString(),
      },
    ]);

    const batchSize = Math.ceil(esBulkContent.length / this.INDEX_BATCH_SIZE);

    const bulkPromises = [];
    for (let i = 0; i < esBulkContent.length; i += batchSize * 2) {
      bulkPromises.push(
        this.esClient.bulk({
          operations: esBulkContent.slice(i, i + batchSize * 2),
          refresh: false,
        }),
      );
    }

    const results = await Promise.all(bulkPromises);
    if (results.some((result) => result.errors)) {
      const erroredItems = results
        .flatMap((result) => result.items)
        .filter(
          (item) =>
            item.index.error || item.create?.error || item.update?.error || item.delete?.error,
        )
        .map((item) => ({
          id: item.index._id,
          error: item.index.error || item.create?.error || item.update?.error || item.delete?.error,
          status: item.index.status,
        }));

      this.logger.error({ errored: erroredItems }, 'Index errored');
      throw new Error('Index errored');
    }
  }

  private async syncModlogs(): Promise<void> {
    const modlogRepository = this.connection.getRepository(ModLog);

    let { lastUpdatedAt } = (await this.cacheRepository.recover<LastSyncState>(
      'modlog-sync-state',
    )) ?? {
      lastUpdatedAt: new Date(0).toISOString(),
    };

    let stop = false;

    while (!stop) {
      const modlogs = await modlogRepository
        .createQueryBuilder('modlog')
        .where('modlog.updated_at > :lastUpdatedAt', {
          lastUpdatedAt,
        })
        .orderBy('modlog.updated_at', 'ASC')
        .limit(this.SYNC_BATCH_SIZE)
        .getMany();

      if (modlogs.length) {
        await this.batchProcessModlogs(modlogs);
        lastUpdatedAt = modlogs.at(-1).updated_at.toISOString();

        await this.cacheRepository.save('modlog-sync-state', { lastUpdatedAt });
        this.logger.debug(`Processed ${modlogs.length} modlogs. Last updated_at: ${lastUpdatedAt}`);
      }

      if (modlogs.length < this.SYNC_BATCH_SIZE) {
        this.logger.debug('Synchronization is up to date');
        stop = true;
      }
    }
  }
}
