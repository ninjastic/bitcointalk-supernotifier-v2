import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterMeritsUniqueIndex1676523556765 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX merits_idx_date_amount_post_id;');
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS merits_idx_date_amount_post_id_sender_uid ON public.merits USING btree (date, amount, post_id, sender_uid);',
    );
    await queryRunner.query('DROP TYPE merit_key;');
    await queryRunner.query(
      'CREATE TYPE merit_key AS (date timestamp, amount integer, post_id integer, sender_uid integer);',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX merits_idx_date_amount_post_id_sender_uid;',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS merits_idx_date_amount_post_id ON public.merits USING btree (date, amount, post_id);',
    );
    await queryRunner.query('DROP TYPE merit_key;');
    await queryRunner.query(
      'CREATE TYPE merit_key AS (date timestamp, amount integer, post_id integer);',
    );
  }
}
