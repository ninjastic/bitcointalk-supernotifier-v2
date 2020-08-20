import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('ignored_users')
class IgnoredUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: false })
  username: string;

  @Column({ type: 'integer', array: true, default: [] })
  ignoring: number[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default IgnoredUser;
