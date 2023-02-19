import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('web_users')
class WebUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: number;

  @Column()
  username: string;

  @CreateDateColumn()
  created_at: Date;

  @CreateDateColumn()
  updated_at: Date;
}

export default WebUser;
