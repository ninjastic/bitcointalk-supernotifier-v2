import type { MigrationInterface, QueryRunner } from 'typeorm';

import { Table, TableForeignKey } from 'typeorm';

export class CreateIgnoredTopics1598381391526 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ignored_topics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'topic_id',
            type: 'integer',
            isUnique: true,
          },
          {
            name: 'post_id',
            type: 'integer',
            isUnique: true,
          },
          {
            name: 'ignoring',
            type: 'integer',
            isArray: true,
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

    await queryRunner.createForeignKey(
      'ignored_topics',
      new TableForeignKey({
        columnNames: ['post_id'],
        referencedTableName: 'posts',
        referencedColumnNames: ['post_id'],
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ignored_topics');
  }
}
