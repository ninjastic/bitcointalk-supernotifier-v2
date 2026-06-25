import type { MigrationInterface, QueryRunner } from 'typeorm';

import { Table } from 'typeorm';

export class CreateAdvancedMatchJoinTables1782000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'advanced_match_authors',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          { name: 'advanced_match_id', type: 'uuid' },
          { name: 'author', type: 'varchar' },
        ],
        foreignKeys: [
          {
            columnNames: ['advanced_match_id'],
            referencedTableName: 'advanced_matches',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'advanced_match_boards',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          { name: 'advanced_match_id', type: 'uuid' },
          { name: 'board_id', type: 'integer' },
        ],
        foreignKeys: [
          {
            columnNames: ['advanced_match_id'],
            referencedTableName: 'advanced_matches',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['board_id'],
            referencedTableName: 'boards',
            referencedColumnNames: ['board_id'],
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'advanced_match_topics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          { name: 'advanced_match_id', type: 'uuid' },
          { name: 'topic_id', type: 'integer' },
        ],
        foreignKeys: [
          {
            columnNames: ['advanced_match_id'],
            referencedTableName: 'advanced_matches',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
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
      'CREATE INDEX IF NOT EXISTS am_authors_match_id_idx ON advanced_match_authors(advanced_match_id);',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS am_boards_match_id_idx ON advanced_match_boards(advanced_match_id);',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS am_topics_match_id_idx ON advanced_match_topics(advanced_match_id);',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS am_topics_match_id_idx;');
    await queryRunner.query('DROP INDEX IF EXISTS am_boards_match_id_idx;');
    await queryRunner.query('DROP INDEX IF EXISTS am_authors_match_id_idx;');
    await queryRunner.dropTable('advanced_match_topics');
    await queryRunner.dropTable('advanced_match_boards');
    await queryRunner.dropTable('advanced_match_authors');
  }
}
