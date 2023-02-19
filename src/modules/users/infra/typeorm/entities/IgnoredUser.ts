import { Entity, Column, CreateDateColumn, UpdateDateColumn, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ignored_users')
class IgnoredUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: true })
  username: string;

  @Column({ type: 'bigint', array: true, default: [] })
  ignoring: number[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default IgnoredUser;
