import type { MigrationInterface, QueryRunner } from 'typeorm';

import { TableColumn } from 'typeorm';

export class AddEnableNewNotificationsToUsers1783000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'enable_new_notifications',
        type: 'boolean',
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'enable_new_notifications');
  }
}
