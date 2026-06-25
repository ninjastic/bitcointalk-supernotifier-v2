import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import User from '../../../../users/infra/typeorm/entities/User';
import AdvancedMatchAuthor from './AdvancedMatchAuthor';
import AdvancedMatchBoard from './AdvancedMatchBoard';
import AdvancedMatchTopic from './AdvancedMatchTopic';

@Entity('advanced_matches')
class AdvancedMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  telegram_id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'telegram_id', referencedColumnName: 'telegram_id' })
  user: User;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  title_regex: string | null;

  @Column({ type: 'varchar', nullable: true })
  content_regex: string | null;

  @OneToMany(() => AdvancedMatchAuthor, (author) => author.advancedMatch, { cascade: true })
  authors: AdvancedMatchAuthor[];

  @OneToMany(() => AdvancedMatchBoard, (board) => board.advancedMatch, { cascade: true })
  boards: AdvancedMatchBoard[];

  @OneToMany(() => AdvancedMatchTopic, (topic) => topic.advancedMatch, { cascade: true })
  topics: AdvancedMatchTopic[];

  @Column({ type: 'boolean', default: false })
  only_topics: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default AdvancedMatch;
