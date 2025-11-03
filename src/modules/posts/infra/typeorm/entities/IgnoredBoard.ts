import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn
} from 'typeorm';
import Board from './Board';

@Entity('ignored_boards')
class IgnoredBoard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('bigint')
  telegram_id: string;

  @Column('integer')
  board_id: number;

  @OneToOne(() => Board)
  @JoinColumn({ name: 'board_id', referencedColumnName: 'board_id' })
  board: Board;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default IgnoredBoard;
