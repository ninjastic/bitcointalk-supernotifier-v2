import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTrackedBoards1677401755478 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tracked_boards',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid'
          },
          {
            name: 'board_id',
            type: 'integer'
          },
          {
            name: 'telegram_id',
            type: 'bigint'
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
            columnNames: ['board_id', 'telegram_id'],
            isUnique: true
          }
        ],
        foreignKeys: [
          {
            referencedTableName: 'users',
            columnNames: ['telegram_id'],
            referencedColumnNames: ['telegram_id']
          },
          {
            referencedTableName: 'boards',
            columnNames: ['board_id'],
            referencedColumnNames: ['board_id']
          }
        ]
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tracked_boards');
  }
}
