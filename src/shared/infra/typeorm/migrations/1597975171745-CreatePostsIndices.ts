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

    await queryRunner.query(`
      CREATE FUNCTION to_tsvector_forum_content(text_content text) returns tsvector as $$
        begin
          return to_tsvector('simple', regexp_replace(regexp_replace(text_content, E'<br>', ' ', 'gi'), E'Quote from:.*</div>|(_|-){3,}', '', 'gi'));
        end
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS posts_checked_archive_idx ON posts(checked, archive) WHERE checked = false AND archive = false;',
    );

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS posts_content_search ON posts using gin(to_tsvector_forum_content(content));',
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

    await queryRunner.query(
      'DROP INDEX IF EXISTS posts_content_search ON posts;',
    );

    await queryRunner.query(
      'DROP INDEX IF EXISTS posts_checked_archive_idx ON posts;',
    );

    await queryRunner.query(
      'DROP FUNCTION IF EXISTS to_tsvector_forum_content(text_content text);',
    );
  }
}
