import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('topics_missing')
class TopicMissing {
  @PrimaryColumn('integer')
  id: number;

  @Column('timestamp')
  verified_at: Date;
}

export default TopicMissing;
