import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePostsDateIndex1599383111140 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX IF NOT EXISTS posts_date_idx ON posts(date);');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS posts_date_idx;');
  }
}
