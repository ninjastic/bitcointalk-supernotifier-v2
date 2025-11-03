/* eslint-disable no-await-in-loop */
import type { Connection } from 'typeorm';
import type { Client } from '@elastic/elasticsearch';
import Board from '##/modules/posts/infra/typeorm/entities/Board';
import baseLogger from '##/shared/services/logger';
import { OllamaEmbeddings } from '@langchain/ollama';
import type RedisProvider from '##/shared/container/providers/implementations/RedisProvider';

interface LastSyncState {
  lastUpdatedAt: string;
}

export class SyncBoardsPipeline {
  private readonly logger = baseLogger.child({ pipeline: 'syncBoardsPipeline' });

  private embeddings = new OllamaEmbeddings({
    model: 'nomic-embed-text'
  });

  private readonly INDEX_NAME = 'boards_v2';

  private readonly INDEX_TEMPLATE_NAME = 'boards_v2_template';

  constructor(
    private readonly connection: Connection,
    private readonly esClient: Client,
    private readonly cacheRepository: RedisProvider
  ) {}

  public async execute(): Promise<void> {
    try {
      await this.setupElasticsearchTemplate();
      await this.createOrUpdateIndex();
      await this.syncBoards();
    } catch (error) {
      this.logger.error({ error }, 'Error during synchronization');
    }
  }

  private async setupElasticsearchTemplate(): Promise<void> {
    try {
      await this.esClient.indices.putTemplate({
        name: this.INDEX_TEMPLATE_NAME,
        index_patterns: [this.INDEX_NAME],
        settings: {},
        mappings: {
          properties: {
            board_id: { type: 'integer' },
            name: {
              type: 'keyword'
            },
            embeddings: {
              type: 'dense_vector'
            },
            parent_id: { type: 'integer' }
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

  private async batchProcessBoard(boards: Board[]): Promise<void> {
    const embeddingsArray = await this.embeddings.embedDocuments(boards.map(board => board.name));

    const esBulkContent = boards.flatMap((board, i) => [
      { index: { _index: this.INDEX_NAME, _id: board.board_id.toString() } },
      {
        board_id: board.board_id,
        name: board.name,
        parent_id: board.parent_id,
        embeddings: embeddingsArray[i]
      }
    ]);

    const results = await this.esClient.bulk({ operations: esBulkContent, refresh: false });

    if (results.errors) {
      const erroredItems = results.items
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

  private async syncBoards(): Promise<void> {
    const boardsRepository = this.connection.getRepository(Board);

    let { lastUpdatedAt } = (await this.cacheRepository.recover<LastSyncState>('boards-sync-state')) ?? {
      lastUpdatedAt: new Date(0).toISOString()
    };
    const boards = await boardsRepository
      .createQueryBuilder('boards')
      .select(['*', 'boards.updated_at::text'])
      .where('boards.updated_at > :lastUpdatedAt', { lastUpdatedAt })
      .orderBy('boards.updated_at', 'ASC')
      .getRawMany();

    if (boards.length) {
      await this.batchProcessBoard(boards);
      this.logger.debug(`Processed ${boards.length} boards.`);

      lastUpdatedAt = boards.at(-1).updated_at;
      await this.cacheRepository.save('boards-sync-state', { lastUpdatedAt });
    }
  }
}
