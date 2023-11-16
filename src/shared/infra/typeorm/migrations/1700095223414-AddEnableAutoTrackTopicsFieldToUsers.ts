import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOwnTopicsFieldToUsers1700095223414 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'enable_auto_track_topics',
        type: 'boolean',
        default: false,
        isNullable: false
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'enable_auto_track_topics');
  }
}
