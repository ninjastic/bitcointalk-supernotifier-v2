import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('reports')
class Report {
  @PrimaryColumn('date')
  date: Date;

  @Column()
  posts: number;

  @Column()
  merits: number;

  @Column()
  users: number;
}

export default Report;
