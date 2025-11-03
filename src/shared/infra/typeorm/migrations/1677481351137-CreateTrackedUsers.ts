import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table } from 'typeorm';

export class CreateTrackedUsers1677481351137 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tracked_users',
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
            name: 'username',
            type: 'varchar'
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
            columnNames: ['telegram_id', 'username'],
            isUnique: true
          }
        ],
        foreignKeys: [
          {
            referencedTableName: 'users',
            columnNames: ['telegram_id'],
            referencedColumnNames: ['telegram_id']
          }
        ]
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tracked_users');
  }
}
