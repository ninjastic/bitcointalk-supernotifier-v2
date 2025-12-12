import type { MigrationInterface, QueryRunner } from 'typeorm';

import { TableColumn } from 'typeorm';

export class AddPostIdToModLog1765499982880 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('modlog', new TableColumn({
      name: 'post_id',
      type: 'integer',
      isNullable: true,
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('modlog', 'post_id');
  }
}
