import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnableOnlyDirectToUsers1745091913195 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('users', {
      name: 'enable_only_direct_mentions',
      type: 'boolean',
      default: false
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'enable_only_direct_mentions');
  }
}
