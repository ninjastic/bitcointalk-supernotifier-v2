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

@Entity('tracked_phrases')
class TrackedPhrase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar')
  phrase: string;

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

export default TrackedPhrase;
