import type { MigrationInterface, QueryRunner } from 'typeorm';

import { Table } from 'typeorm';

export class CreateMerits1597728972333 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'merits',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'amount',
            type: 'integer',
          },
          {
            name: 'sender',
            type: 'varchar',
          },
          {
            name: 'sender_uid',
            type: 'integer',
          },
          {
            name: 'receiver',
            type: 'varchar',
          },
          {
            name: 'receiver_uid',
            type: 'integer',
          },
          {
            name: 'date',
            type: 'timestamp with time zone',
          },
          {
            name: 'post_id',
            type: 'integer',
          },
          {
            name: 'topic_id',
            type: 'integer',
          },
          {
            name: 'notified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'notified_to',
            type: 'integer',
            isArray: true,
          },
          {
            name: 'checked',
            type: 'boolean',
            default: false,
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
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('merits');
  }
}
