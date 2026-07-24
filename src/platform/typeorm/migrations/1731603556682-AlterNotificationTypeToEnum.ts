import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterNotificationTypeToEnum1731603556682 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "notification_type" AS ENUM(
        'post_mention',
        'merit',
        'tracked_topic',
        'tracked_board',
        'tracked_user',
        'tracked_phrase',
        'auto_track_topic_request',
        'remove_topic'
      )`);
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "notification_type" USING "type"::"notification_type"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE character varying USING "type"::character varying`,
    );
    await queryRunner.query(`DROP TYPE "notification_type"`);
  }
}
