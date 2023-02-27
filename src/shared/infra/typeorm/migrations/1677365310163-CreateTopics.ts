import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTopics1677365310163 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'topics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid'
          },
          {
            name: 'topic_id',
            type: 'integer',
            isUnique: true
          },
          {
            name: 'post_id',
            type: 'integer',
            isUnique: true
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
            referencedTableName: 'posts',
            columnNames: ['post_id'],
            referencedColumnNames: ['post_id']
          }
        ]
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('topics');
  }
}
