import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTrackedTopicsUsers1602616820977 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE UNIQUE INDEX UQ_telegram_id ON users(telegram_id);');

    await queryRunner.createTable(
      new Table({
        name: 'tracked_topics_users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid'
          },
          {
            name: 'tracked_topic_id',
            type: 'integer'
          },
          {
            name: 'telegram_id',
            type: 'integer'
          },
          {
            name: 'username',
            type: 'varchar'
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
        ],
        foreignKeys: [
          {
            columnNames: ['tracked_topic_id'],
            referencedTableName: 'tracked_topics',
            referencedColumnNames: ['topic_id']
          },
          {
            columnNames: ['telegram_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['telegram_id']
          }
        ]
      })
    );

    await queryRunner.query('CREATE INDEX ON tracked_topics_users(telegram_id)');

    await queryRunner.query('CREATE INDEX ON tracked_topics_users(tracked_topic_id)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tracked_topics_users');
    await queryRunner.query('DROP INDEX UQ_telegram_id');
  }
}
