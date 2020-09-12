import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class CreatePostsIndices1597975171745 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'posts',
      new TableIndex({
        columnNames: ['topic_id'],
      }),
    );

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS posts_author_idx ON posts((lower(author)));',
    );

    await queryRunner.createIndex(
      'posts',
      new TableIndex({
        columnNames: ['author_uid'],
      }),
    );

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS posts_checked_archive_idx ON posts(checked, archive) WHERE checked = false AND archive = false;',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('posts');

    let index = null;

    index = table.indices.find(fk => fk.columnNames.indexOf('topic_id') !== -1);
    await queryRunner.dropIndex('posts', index);

    await queryRunner.query(
      'CREATE INDEX IF EXISTS posts_author_idx ON posts;',
    );

    index = table.indices.find(
      fk => fk.columnNames.indexOf('author_uid') !== -1,
    );
    await queryRunner.dropIndex('posts', index);

    await queryRunner.query('DROP INDEX IF EXISTS posts_checked_archive_idx;');
  }
}
