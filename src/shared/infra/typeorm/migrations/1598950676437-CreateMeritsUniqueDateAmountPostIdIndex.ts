import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMeritsUniqueDateAmountPostIdIndex1598950676437 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS merits_idx_date_amount_post_id ON public.merits USING btree (date, amount, post_id);'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS merits_idx_date_amount_post_id;');
  }
}
