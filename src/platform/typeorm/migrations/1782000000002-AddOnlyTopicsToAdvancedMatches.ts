import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnlyTopicsToAdvancedMatches1782000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE advanced_matches ADD COLUMN IF NOT EXISTS only_topics boolean NOT NULL DEFAULT false;',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE advanced_matches DROP COLUMN IF EXISTS only_topics;');
  }
}
