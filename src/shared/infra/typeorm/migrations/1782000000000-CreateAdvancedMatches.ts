import type { MigrationInterface, QueryRunner } from 'typeorm';

import { Table } from 'typeorm';

export class CreateAdvancedMatches1782000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'advanced_matches',
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
            name: 'name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'title_regex',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'content_regex',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'author',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'board_id',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'topic_id',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'only_topics',
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
            columnNames: ['telegram_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['telegram_id'],
          },
          {
            columnNames: ['board_id'],
            referencedTableName: 'boards',
            referencedColumnNames: ['board_id'],
          },
          {
            columnNames: ['topic_id'],
            referencedTableName: 'topics',
            referencedColumnNames: ['topic_id'],
          },
        ],
      }),
    );

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS advanced_matches_telegram_id_idx ON advanced_matches(telegram_id);',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS advanced_matches_board_id_idx ON advanced_matches(board_id);',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS advanced_matches_topic_id_idx ON advanced_matches(topic_id);',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS advanced_matches_topic_id_idx;');
    await queryRunner.query('DROP INDEX IF EXISTS advanced_matches_board_id_idx;');
    await queryRunner.query('DROP INDEX IF EXISTS advanced_matches_telegram_id_idx;');
    await queryRunner.dropTable('advanced_matches');
  }
}
