import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModLogTypeUserIdIndex1765600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS modlog_type_user_id_idx ON modlog(type, user_id);',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS modlog_type_user_id_idx;');
  }
}
