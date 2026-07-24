import type { MigrationInterface, QueryRunner } from 'typeorm';

import { Table } from 'typeorm';

export class CreatePosts1597725891319 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'posts',
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
            isUnique: true,
          },
          {
            name: 'topic_id',
            type: 'integer',
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'author',
            type: 'varchar',
          },
          {
            name: 'author_uid',
            type: 'integer',
          },
          {
            name: 'content',
            type: 'varchar',
          },
          {
            name: 'date',
            type: 'timestamp with time zone',
          },
          {
            name: 'boards',
            type: 'varchar',
            isArray: true,
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
            name: 'archive',
            type: 'boolean',
            isNullable: true,
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
    await queryRunner.dropTable('posts');
  }
}
