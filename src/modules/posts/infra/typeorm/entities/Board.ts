import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default Board;
