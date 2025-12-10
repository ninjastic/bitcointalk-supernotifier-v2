import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('posts_missing')
class PostMissing {
  @PrimaryColumn('integer')
  id: number;

  @Column('timestamp')
  verified_at: Date;
}

export default PostMissing;
