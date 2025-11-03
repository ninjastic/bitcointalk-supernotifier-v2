import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterNotifiedToTypeToBigInt1676847586623 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE posts ALTER COLUMN notified_to TYPE BIGINT[]');
    await queryRunner.query('ALTER TABLE merits ALTER COLUMN notified_to TYPE BIGINT[]');
    await queryRunner.query('ALTER TABLE modlog ALTER COLUMN notified_to TYPE BIGINT[]');
    await queryRunner.query('ALTER TABLE tracked_topics ALTER COLUMN tracking TYPE BIGINT[]');
    await queryRunner.query('ALTER TABLE tracked_topics_users ALTER COLUMN telegram_id TYPE BIGINT');
    await queryRunner.query('ALTER TABLE tracked_phrases ALTER COLUMN telegram_id TYPE BIGINT');
    await queryRunner.query('ALTER TABLE ignored_topics ALTER COLUMN ignoring TYPE BIGINT[]');
    await queryRunner.query('ALTER TABLE ignored_users ALTER COLUMN ignoring TYPE BIGINT[]');
    await queryRunner.query('ALTER TABLE posts_history ALTER COLUMN notified_to TYPE BIGINT[]');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE posts ALTER COLUMN notified_to TYPE INTEGER[]');
    await queryRunner.query('ALTER TABLE merits ALTER COLUMN notified_to TYPE INTEGER[]');
    await queryRunner.query('ALTER TABLE modlog ALTER COLUMN notified_to TYPE INTEGER[]');
    await queryRunner.query('ALTER TABLE tracked_topics ALTER COLUMN tracking TYPE INTEGER[]');
    await queryRunner.query('ALTER TABLE tracked_topics_users ALTER COLUMN telegram_id TYPE INTEGER');
    await queryRunner.query('ALTER TABLE tracked_phrases ALTER COLUMN telegram_id TYPE INTEGER');
    await queryRunner.query('ALTER TABLE ignored_topics ALTER COLUMN ignoring TYPE INTEGER[]');
    await queryRunner.query('ALTER TABLE ignored_users ALTER COLUMN ignoring TYPE INTEGER[]');
    await queryRunner.query('ALTER TABLE posts_history ALTER COLUMN notified_to TYPE INTEGER[]');
  }
}
