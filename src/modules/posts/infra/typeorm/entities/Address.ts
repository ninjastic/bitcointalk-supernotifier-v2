import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('addresses')
class Address {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar')
  coin: string;

  @Column({ type: 'varchar', unique: true })
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
