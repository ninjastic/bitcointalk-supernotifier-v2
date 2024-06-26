import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class DeleteWebNotificationsAndWebUsers1706541832645 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('web_notifications');
    await queryRunner.dropTable('web_users');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'web_users',
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

    await queryRunner.createTable(
      new Table({
        name: 'web_notifications',
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
            type: 'uuid'
          },
          {
            name: 'post_id',
            type: 'integer',
            isNullable: true
          },
          {
            name: 'merit_id',
            type: 'uuid',
            isNullable: true
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
            columnNames: ['post_id'],
            referencedTableName: 'posts',
            referencedColumnNames: ['post_id'],
            onUpdate: 'CASCADE'
          },
          {
            columnNames: ['merit_id'],
            referencedTableName: 'merits',
            referencedColumnNames: ['id'],
            onUpdate: 'CASCADE'
          }
        ]
      })
    );
  }
}
