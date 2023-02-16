import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMeritKeyType1676485386452 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TYPE merit_key AS (date timestamp, amount integer, post_id integer);',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TYPE merit_key;');
  }
}
