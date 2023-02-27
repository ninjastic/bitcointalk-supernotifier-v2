import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';

import User from '../../../../users/infra/typeorm/entities/User';
import Board from './Board';

@Entity('tracked_boards')
class TrackedBoard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  board_id: number;

  @OneToOne(() => Board)
  @JoinColumn({ name: 'board_id', referencedColumnName: 'board_id' })
  board: Board;

  @Column({ type: 'bigint' })
  telegram_id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'telegram_id', referencedColumnName: 'telegram_id' })
  user: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default TrackedBoard;
