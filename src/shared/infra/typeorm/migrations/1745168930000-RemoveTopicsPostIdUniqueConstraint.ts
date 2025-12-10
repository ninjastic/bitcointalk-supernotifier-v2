import type { MigrationInterface, QueryRunner } from 'typeorm';

import { TableUnique } from 'typeorm';

export class RemoveTopicsPostIdUniqueConstraint1752693945182 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropUniqueConstraint('topics', 'UQ_6a488a437cdeb901a8d71831d6e');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createUniqueConstraint(
      'topics',
      new TableUnique({
        name: 'UQ_6a488a437cdeb901a8d71831d6e',
        columnNames: ['post_id'],
      }),
    );
  }
}
