import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class AddPostsRelationToMerits1597848082741
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createForeignKey(
      'merits',
      new TableForeignKey({
        columnNames: ['post_id'],
        referencedTableName: 'posts',
        referencedColumnNames: ['post_id'],
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('merits');
    const foreignKey = table.foreignKeys.find(
      fk => fk.columnNames.indexOf('post_id') !== -1,
    );

    await queryRunner.dropForeignKey('merits', foreignKey);
  }
}
