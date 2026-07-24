import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSigBanRemovedNotificationType1765700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'sig_ban'`);
    await queryRunner.query(
      `ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'sig_ban_removed'`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing an enum value safely.
  }
}
