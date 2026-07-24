import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdvancedMatchNotificationType1782000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'advanced_match'`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing enum values safely without rebuilding the type.
  }
}
