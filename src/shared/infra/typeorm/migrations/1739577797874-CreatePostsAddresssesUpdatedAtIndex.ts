import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePostsAddresssesUpdatedAtIndex1739577797874 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS posts_addresses_updated_at_idx ON posts_addresses(updated_at);'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS posts_addresses_updated_at_idx;');
  }
}
