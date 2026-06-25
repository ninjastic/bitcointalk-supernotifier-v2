import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DropOldAdvancedMatchColumns1782000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ DECLARE
        r record;
      BEGIN
        FOR r IN SELECT con.conname
          FROM pg_constraint con
          JOIN pg_class tab ON con.conrelid = tab.oid
          WHERE tab.relname = 'advanced_matches'
          AND con.confrelid IN (
            SELECT oid FROM pg_class WHERE relname IN ('boards', 'topics')
          )
        LOOP
          EXECUTE 'ALTER TABLE advanced_matches DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
      END $$;
    `);
    await queryRunner.query('DROP INDEX IF EXISTS advanced_matches_board_id_idx;');
    await queryRunner.query('DROP INDEX IF EXISTS advanced_matches_topic_id_idx;');
    await queryRunner.query('ALTER TABLE advanced_matches DROP COLUMN IF EXISTS author;');
    await queryRunner.query('ALTER TABLE advanced_matches DROP COLUMN IF EXISTS board_id;');
    await queryRunner.query('ALTER TABLE advanced_matches DROP COLUMN IF EXISTS topic_id;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE advanced_matches ADD COLUMN author varchar;');
    await queryRunner.query('ALTER TABLE advanced_matches ADD COLUMN board_id integer;');
    await queryRunner.query('ALTER TABLE advanced_matches ADD COLUMN topic_id integer;');
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS advanced_matches_board_id_idx ON advanced_matches(board_id);',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS advanced_matches_topic_id_idx ON advanced_matches(topic_id);',
    );
  }
}
