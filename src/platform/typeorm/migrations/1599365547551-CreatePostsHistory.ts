import type { MigrationInterface, QueryRunner } from 'typeorm';

import { Table } from 'typeorm';

export class CreatePostsHistory1599365547551 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'posts_history',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'post_id',
            type: 'integer',
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'content',
            type: 'varchar',
          },
          {
            name: 'boards',
            type: 'varchar',
            isArray: true,
          },
          {
            name: 'date',
            type: 'timestamp with time zone',
          },
          {
            name: 'version',
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
            name: 'deleted',
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
        foreignKeys: [
          {
            columnNames: ['post_id'],
            referencedTableName: 'posts',
            referencedColumnNames: ['post_id'],
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            columnNames: ['post_id'],
          },
          {
            columnNames: ['checked'],
          },
          {
            columnNames: ['notified_to'],
          },
          {
            columnNames: ['date'],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('posts_history');
  }
}
