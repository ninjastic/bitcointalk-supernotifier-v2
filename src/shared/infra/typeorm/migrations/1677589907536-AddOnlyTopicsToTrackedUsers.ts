import type { MigrationInterface, QueryRunner } from 'typeorm';

import { TableColumn } from 'typeorm';

export class AddOnlyTopicsToTrackedUsers1677589907536 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'tracked_users',
      new TableColumn({
        name: 'only_topics',
        type: 'boolean',
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('tracked_users', 'only_topics');
  }
}
