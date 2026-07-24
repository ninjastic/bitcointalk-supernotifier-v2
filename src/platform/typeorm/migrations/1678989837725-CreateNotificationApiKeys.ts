import type { MigrationInterface, QueryRunner } from 'typeorm';

import { Table } from 'typeorm';

export class CreateNotificationApiKeys1678989837725 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notification_apikeys',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'api_key',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'telegram_id',
            type: 'bigint',
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
            referencedTableName: 'users',
            columnNames: ['telegram_id'],
            referencedColumnNames: ['telegram_id'],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notification_apikeys');
  }
}
