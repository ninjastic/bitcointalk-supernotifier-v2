import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import AdvancedMatch from './AdvancedMatch';
import Topic from './Topic';

@Entity('advanced_match_topics')
class AdvancedMatchTopic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AdvancedMatch, (advancedMatch) => advancedMatch.topics, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'advanced_match_id' })
  advancedMatch: AdvancedMatch;

  @Column({ type: 'integer' })
  topic_id: number;

  @ManyToOne(() => Topic)
  @JoinColumn({ name: 'topic_id', referencedColumnName: 'topic_id' })
  topic: Topic;
}

export default AdvancedMatchTopic;
