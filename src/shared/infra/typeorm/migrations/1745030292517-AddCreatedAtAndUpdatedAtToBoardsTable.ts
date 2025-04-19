import {MigrationInterface, QueryRunner} from "typeorm";

export class AddCreatedAtAndUpdatedAtToBoardsTable1745030292517 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "boards" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now();`);
        await queryRunner.query(`ALTER TABLE "boards" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now();`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "boards" DROP COLUMN "created_at";`);
        await queryRunner.query(`ALTER TABLE "boards" DROP COLUMN "updated_at";`);
    }

}
