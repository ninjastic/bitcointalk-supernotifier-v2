import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTelegramIdTypeToBigInt1659736718511 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query('ALTER TABLE users ALTER COLUMN telegram_id TYPE BIGINT');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query('ALTER TABLE users ALTER COLUMN telegram_id TYPE INTEGER');
  }
}
