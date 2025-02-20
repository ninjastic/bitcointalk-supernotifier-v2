/* eslint-disable no-await-in-loop */
import { Connection } from 'typeorm';
import { Client } from '@elastic/elasticsearch';
import Board from '##/modules/posts/infra/typeorm/entities/Board';
import baseLogger from '##/shared/services/logger';

export class SyncBoardsPipeline {
  private readonly logger = baseLogger.child({ pipeline: 'syncBoardsPipeline' });

  private readonly INDEX_NAME = 'boards';

  private readonly INDEX_TEMPLATE_NAME = 'boards_template';

  constructor(private readonly connection: Connection, private readonly esClient: Client) {}

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
              type: 'text',
              fields: {
                keyword: { type: 'keyword' }
              }
            },
            parent_id: { type: 'integer' }
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

  private async batchProcessBoard(boards: Board[]): Promise<void> {
    const esBulkContent = boards.flatMap(board => [
      { index: { _index: this.INDEX_NAME, _id: board.board_id.toString() } },
      {
        board_id: board.board_id,
        name: board.name,
        parent_id: board.parent_id
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
    const boardRepository = this.connection.getRepository(Board);

    const boards = await boardRepository.createQueryBuilder('boards').orderBy('boards.board_id', 'ASC').getMany();

    if (boards.length) {
      await this.batchProcessBoard(boards);
      this.logger.info(`Processed ${boards.length} boards.`);
    }
  }
}
