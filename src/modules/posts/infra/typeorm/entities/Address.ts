import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('addresses')
class Address {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  coin: string;

  @Column({ unique: true })
  address: string;

  @Column({ type: 'integer', array: true })
  posts_id: number[];

  @Column({ type: 'varchar', array: true })
  authors: string[];

  @Column({ type: 'integer', array: true })
  authors_uid: number[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default Address;
