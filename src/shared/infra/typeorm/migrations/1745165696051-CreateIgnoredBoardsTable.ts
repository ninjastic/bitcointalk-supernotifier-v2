import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table } from 'typeorm';

export class CreateIgnoredBoardsTable1745165696051 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ignored_boards',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid'
          },
          {
            name: 'telegram_id',
            type: 'bigint'
          },
          {
            name: 'board_id',
            type: 'integer'
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()'
          }
        ],
        indices: [
          {
            columnNames: ['telegram_id', 'board_id'],
            isUnique: true
          }
        ],
        foreignKeys: [
          {
            columnNames: ['telegram_id'],
            referencedColumnNames: ['telegram_id'],
            referencedTableName: 'users'
          },
          {
            columnNames: ['board_id'],
            referencedColumnNames: ['board_id'],
            referencedTableName: 'boards'
          }
        ]
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ignored_boards');
  }
}
