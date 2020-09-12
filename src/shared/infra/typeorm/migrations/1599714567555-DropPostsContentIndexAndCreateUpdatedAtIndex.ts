import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropPostsContentIndexAndCreateUpdatedAtIndex1599714567555
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS posts_full_content_search;');

    await queryRunner.query(
      'DROP FUNCTION IF EXISTS to_simple_tsvector_forum_content(text_content text);',
    );

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS posts_updated_at_idx ON posts(updated_at);',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS posts_updated_at_idx;');

    await queryRunner.query(`
        CREATE OR REPLACE FUNCTION to_simple_tsvector_forum_content(text_content text)
        RETURNS tsvector
        LANGUAGE plpgsql
        IMMUTABLE
        AS $function$
            begin
                return to_tsvector('simple', regexp_replace(regexp_replace(text_content, E'<br>', ' ', 'gi'), E'Quote[^,/]+[^<]+|(_|-|@|#){3,}', '', 'g'));
            end
        $function$;
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS posts_full_content_search ON posts using gin(to_simple_tsvector_forum_content(content));',
    );
  }
}
