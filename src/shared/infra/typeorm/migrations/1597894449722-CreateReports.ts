import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateReports1597894449722 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'reports',
        columns: [
          {
            name: 'date',
            type: 'date',
            isPrimary: true
          },
          {
            name: 'posts',
            type: 'integer'
          },
          {
            name: 'merits',
            type: 'integer'
          },
          {
            name: 'users',
            type: 'integer'
          }
        ]
      })
    );

    await queryRunner.query(`
      create or replace function increment_daily_posts()
      returns trigger as $$
      begin
        insert into reports(date, posts, merits, users) select CURRENT_DATE, 0, 0, 0 WHERE NOT EXISTS (SELECT date FROM reports WHERE date = CURRENT_DATE);
        update reports
        set posts = posts + 1
        where date = CURRENT_DATE;
        return new;
      end
      $$ language plpgsql;

      create or replace function increment_daily_merits()
      returns trigger as $$
      begin
        insert into reports(date, posts, merits, users) select CURRENT_DATE, 0, 0, 0 WHERE NOT EXISTS (SELECT date FROM reports WHERE date = CURRENT_DATE);
        update reports
        set merits = merits + 1
        where date = CURRENT_DATE;
        return new;
      end
      $$ language plpgsql;

      create or replace function increment_daily_users()
      returns trigger as $$
      begin
        insert into reports(date, posts, merits, users) select CURRENT_DATE, 0, 0, 0 WHERE NOT EXISTS (SELECT date FROM reports WHERE date = CURRENT_DATE);
        update reports
        set users = users + 1
        where date = CURRENT_DATE;
        return new;
      end
      $$ language plpgsql;
      
      CREATE TRIGGER increment_daily_posts 
      AFTER INSERT ON posts FOR EACH ROW 
      EXECUTE PROCEDURE increment_daily_posts();
      
      CREATE TRIGGER increment_daily_merits 
      AFTER INSERT ON merits FOR EACH ROW 
      EXECUTE PROCEDURE increment_daily_merits();

      CREATE TRIGGER increment_daily_users 
      AFTER INSERT ON users FOR EACH ROW 
      EXECUTE PROCEDURE increment_daily_users();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER increment_daily_posts ON posts;
      DROP TRIGGER increment_daily_merits ON merits;
      DROP TRIGGER increment_daily_users ON users;
    `);

    await queryRunner.query(`
      DROP FUNCTION increment_daily_posts();
      DROP FUNCTION increment_daily_merits();
      DROP FUNCTION increment_daily_users();
    `);

    await queryRunner.dropTable('reports');
  }
}
