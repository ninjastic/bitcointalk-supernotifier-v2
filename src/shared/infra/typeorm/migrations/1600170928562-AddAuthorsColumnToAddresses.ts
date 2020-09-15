import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAuthorsColumnToAddresses1600170928562
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'addresses',
      new TableColumn({
        name: 'authors',
        type: 'varchar',
        isArray: true,
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'addresses',
      new TableColumn({
        name: 'authors_uid',
        type: 'integer',
        isArray: true,
        isNullable: true,
      }),
    );

    await queryRunner.query(`
    CREATE OR REPLACE FUNCTION array_lowercase(varchar[]) RETURNS varchar[] AS
      $BODY$
        SELECT array_agg(q.author) FROM (
          SELECT lower(unnest($1))::varchar AS author
        ) AS q;
      $BODY$
    language sql IMMUTABLE;`);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS addresses_authors_idx on addresses USING GIN(array_lowercase(authors));`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS addresses_authors_uid_idx on addresses USING GIN(authors_uid);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    DROP FUNCTION array_lowercase(varchar[]);`);

    await queryRunner.dropColumn('addresses', 'authors');
    await queryRunner.dropColumn('addresses', 'authors_uid');
  }
}
