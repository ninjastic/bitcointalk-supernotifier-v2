import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('boards')
class Board {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  board_id: number;

  @Column()
  name: string;

  @Column()
  parent_id: number;
}

export default Board;
