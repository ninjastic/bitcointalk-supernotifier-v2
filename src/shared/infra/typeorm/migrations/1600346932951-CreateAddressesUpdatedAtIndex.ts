import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAddressesUpdatedAtIndex1600346932951
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS addresses_updated_at_idx ON addresses(updated_at);',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS addresses_updated_at_idx;');
  }
}
