import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropPostsContentIndexAndCreateUpdatedAtIndex1599714567555
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS posts_updated_at_idx ON posts(updated_at);',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS posts_updated_at_idx;');
  }
}
