import type { MigrationInterface, QueryRunner } from 'typeorm';

import { Table } from 'typeorm';

export class CreatePostsVersions1743459130970 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'posts_versions',
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
            name: 'new_title',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'new_content',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'edit_date',
            type: 'timestamp with time zone',
            isNullable: true,
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
        indices: [{ columnNames: ['post_id', 'edit_date', 'created_at'] }],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('post_versions');
  }
}
