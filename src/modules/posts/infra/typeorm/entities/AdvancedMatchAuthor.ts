import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import AdvancedMatch from './AdvancedMatch';

@Entity('advanced_match_authors')
class AdvancedMatchAuthor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AdvancedMatch, (advancedMatch) => advancedMatch.authors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'advanced_match_id' })
  advancedMatch: AdvancedMatch;

  @Column({ type: 'varchar' })
  author: string;
}

export default AdvancedMatchAuthor;
