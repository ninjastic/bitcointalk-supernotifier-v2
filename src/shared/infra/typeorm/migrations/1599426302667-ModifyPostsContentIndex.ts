import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModifyPostsContentIndex1599426302667
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS posts_content_search;');

    await queryRunner.query(
      'DROP FUNCTION IF EXISTS to_tsvector_forum_content(text_content text);',
    );

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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS posts_full_content_search;');

    await queryRunner.query(
      'DROP FUNCTION IF EXISTS to_simple_tsvector_forum_content(text_content text);',
    );

    await queryRunner.query(`
        CREATE FUNCTION to_tsvector_forum_content(text_content text) returns tsvector as $$
          begin
            return to_tsvector('simple', regexp_replace(regexp_replace(text_content, E'<br>', ' ', 'gi'), E'Quote from:.*</div>|(_|-){3,}', '', 'gi'));
          end
        $$ LANGUAGE plpgsql;
      `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS posts_content_search ON posts using gin(to_tsvector_forum_content(content));',
    );
  }
}
