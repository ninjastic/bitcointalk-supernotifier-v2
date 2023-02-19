import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsers1597729247375 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid'
          },
          {
            name: 'user_id',
            type: 'integer'
          },
          {
            name: 'username',
            type: 'varchar'
          },
          {
            name: 'alternative_usernames',
            type: 'varchar',
            isArray: true
          },
          {
            name: 'language',
            type: 'varchar',
            default: "'en'"
          },
          {
            name: 'telegram_id',
            type: 'integer'
          },
          {
            name: 'enable_mentions',
            type: 'boolean'
          },
          {
            name: 'enable_merits',
            type: 'boolean'
          },
          {
            name: 'blocked',
            type: 'boolean',
            default: false
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()'
          }
        ]
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
