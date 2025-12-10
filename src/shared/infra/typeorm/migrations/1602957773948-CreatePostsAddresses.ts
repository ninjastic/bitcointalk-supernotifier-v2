import type { MigrationInterface, QueryRunner } from 'typeorm';

import { Table } from 'typeorm';

export class CreatePostsAddresses1602957773948 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'posts_addresses',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'address',
            type: 'varchar',
          },
          {
            name: 'coin',
            type: 'varchar',
          },
          {
            name: 'post_id',
            type: 'integer',
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
          },
        ],
      }),
    );

    await queryRunner.query('CREATE UNIQUE INDEX ON posts_addresses USING btree(address, post_id);');

    await queryRunner.query('CREATE INDEX ON posts_addresses(post_id);');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('posts_addresses');
  }
}
