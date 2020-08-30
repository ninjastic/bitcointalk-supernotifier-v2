import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAddresses1598734976233 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'addresses',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'coin',
            type: ' varchar',
          },
          {
            name: 'address',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'posts_id',
            type: 'integer',
            isArray: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.query(
      `CREATE INDEX addresses_posts_id_idx on addresses USING GIN(posts_id);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX addresses_posts_id_idx;`);

    await queryRunner.dropTable('addresses');
  }
}
