import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableIndex } from 'typeorm';

export class CreatePostsVersionsNewTitleIndex1743697545172 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX IF NOT EXISTS posts_versions_new_title_idx ON posts_versions(new_title);');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS posts_versions_new_title_idx;');
  }
}
