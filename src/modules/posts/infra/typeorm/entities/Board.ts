import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('boards')
class Board {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('integer')
  board_id: number;

  @Column('varchar')
  name: string;

  @Column('integer')
  parent_id: number;
}

export default Board;
