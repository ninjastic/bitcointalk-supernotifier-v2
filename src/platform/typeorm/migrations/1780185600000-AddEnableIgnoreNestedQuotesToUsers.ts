import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnableIgnoreNestedQuotesToUsers1780185600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('users', {
      name: 'enable_ignore_nested_quotes',
      type: 'boolean',
      default: false,
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'enable_ignore_nested_quotes');
  }
}
