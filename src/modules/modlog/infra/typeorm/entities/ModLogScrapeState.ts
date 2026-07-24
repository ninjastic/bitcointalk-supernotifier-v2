import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('modlog_scrape_state')
class ModLogScrapeState {
  @PrimaryColumn('integer')
  id: number;

  @Column({ type: 'jsonb' })
  fingerprints: string[];

  @UpdateDateColumn()
  updated_at: Date;
}

export default ModLogScrapeState;
