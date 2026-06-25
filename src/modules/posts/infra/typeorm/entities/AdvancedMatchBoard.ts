import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import AdvancedMatch from './AdvancedMatch';
import Board from './Board';

@Entity('advanced_match_boards')
class AdvancedMatchBoard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AdvancedMatch, (advancedMatch) => advancedMatch.boards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'advanced_match_id' })
  advancedMatch: AdvancedMatch;

  @Column({ type: 'integer' })
  board_id: number;

  @ManyToOne(() => Board)
  @JoinColumn({ name: 'board_id', referencedColumnName: 'board_id' })
  board: Board;
}

export default AdvancedMatchBoard;
