import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateModLogScrapeState1765800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "modlog_scrape_state" (
        "id" integer NOT NULL,
        "fingerprints" jsonb NOT NULL,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_modlog_scrape_state_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "modlog_scrape_state"');
  }
}
