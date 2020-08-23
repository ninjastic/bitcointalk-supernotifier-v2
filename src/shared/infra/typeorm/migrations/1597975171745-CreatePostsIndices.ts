import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class CreatePostsIndices1597975171745 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'posts',
      new TableIndex({
        columnNames: ['topic_id'],
      }),
    );

    await queryRunner.createIndex(
      'posts',
      new TableIndex({
        columnNames: ['author'],
      }),
    );

    await queryRunner.createIndex(
      'posts',
      new TableIndex({
        columnNames: ['author_uid'],
      }),
    );

    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS posts_content_search ON posts using gin(to_tsvector('simple', regexp_replace(regexp_replace(content, E'<br>', ' ', 'gi'), E'Quote from:.*<\\/div>|<[^>]*>|(_|-){3,}', '', 'gi')));",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('posts');

    let index = null;

    index = table.indices.find(fk => fk.columnNames.indexOf('topic_id') !== -1);
    await queryRunner.dropIndex('posts', index);

    index = table.indices.find(fk => fk.columnNames.indexOf('author') !== -1);
    await queryRunner.dropIndex('posts', index);

    index = table.indices.find(
      fk => fk.columnNames.indexOf('author_uid') !== -1,
    );
    await queryRunner.dropIndex('posts', index);

    index = table.indices.find(
      fk => fk.columnNames.indexOf('posts_content_search') !== -1,
    );
    await queryRunner.dropIndex('posts', index);
  }
}
