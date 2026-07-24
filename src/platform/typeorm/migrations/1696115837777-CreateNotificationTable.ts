import type { MigrationInterface, QueryRunner } from 'typeorm';

import { Table } from 'typeorm';

export class CreateNotificationTable1696115837777 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'telegram_id',
            type: 'bigint',
          },
          {
            name: 'type',
            type: 'varchar',
          },
          {
            name: 'metadata',
            type: 'jsonb',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['telegram_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['telegram_id'],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notifications');
  }
}
