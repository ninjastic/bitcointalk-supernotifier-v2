import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableColumn } from 'typeorm';

export class AddIsGroupToUsers1683437850770 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'is_group',
        type: 'boolean',
        default: false
      })
    );

    await queryRunner.query('ALTER TABLE users ALTER COLUMN username DROP NOT NULL');
    await queryRunner.query('ALTER TABLE users ALTER COLUMN user_id DROP NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE users ALTER COLUMN username SET NOT NULL');
    await queryRunner.query('ALTER TABLE users ALTER COLUMN user_id SET NOT NULL');
    await queryRunner.dropColumn('users', 'is_group');
  }
}
