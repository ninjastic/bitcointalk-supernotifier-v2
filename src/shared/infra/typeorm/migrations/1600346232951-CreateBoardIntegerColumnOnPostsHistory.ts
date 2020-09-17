import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class CreateBoardIntegerColumnOnPostsHistory1600346232951
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'posts_history',
      new TableColumn({
        name: 'board_id',
        type: 'integer',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('posts_history', 'board_id');
  }
}
