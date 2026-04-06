import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckerSupportIndexes1765505000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS notifications_type_telegram_id_idx ON notifications(type, telegram_id);',
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS notifications_type_telegram_post_id_idx ON notifications(type, telegram_id, ((metadata->>'post_id')));",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS notifications_type_telegram_topic_id_idx ON notifications(type, telegram_id, ((metadata->>'topic_id')));",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS notifications_type_telegram_phrase_idx ON notifications(type, telegram_id, ((metadata->>'phrase')));",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS notifications_type_telegram_author_idx ON notifications(type, telegram_id, ((metadata->>'author')));",
    );
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS notifications_type_telegram_board_id_idx ON notifications(type, telegram_id, ((metadata->>'board_id')));",
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS modlog_type_checked_created_at_idx ON modlog(type, checked, created_at DESC);',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS posts_versions_post_id_deleted_idx ON posts_versions(post_id, deleted);',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS posts_versions_active_content_idx ON posts_versions(post_id) WHERE deleted = false AND new_content IS NOT NULL;',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS posts_versions_active_content_idx;');
    await queryRunner.query('DROP INDEX IF EXISTS posts_versions_post_id_deleted_idx;');
    await queryRunner.query('DROP INDEX IF EXISTS modlog_type_checked_created_at_idx;');
    await queryRunner.query('DROP INDEX IF EXISTS notifications_type_telegram_board_id_idx;');
    await queryRunner.query('DROP INDEX IF EXISTS notifications_type_telegram_author_idx;');
    await queryRunner.query('DROP INDEX IF EXISTS notifications_type_telegram_phrase_idx;');
    await queryRunner.query('DROP INDEX IF EXISTS notifications_type_telegram_topic_id_idx;');
    await queryRunner.query('DROP INDEX IF EXISTS notifications_type_telegram_post_id_idx;');
    await queryRunner.query('DROP INDEX IF EXISTS notifications_type_telegram_id_idx;');
  }
}
