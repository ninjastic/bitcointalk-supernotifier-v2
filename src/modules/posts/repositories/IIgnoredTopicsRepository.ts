import IgnoredTopic from '../infra/typeorm/entities/IgnoredTopic';
import CreateIgnoredTopicDTO from '../dtos/CreateIgnoredTopicDTO';

export default interface IIgnoredUserRepository {
  create(data: CreateIgnoredTopicDTO): IgnoredTopic;
  save(user: IgnoredTopic): Promise<IgnoredTopic>;
  findOneByTopicId(topic_id: number): Promise<IgnoredTopic | undefined>;
  findOneByPostId(post_id: number): Promise<IgnoredTopic | undefined>;
  findAllByTelegramId(telegram_id: number): Promise<IgnoredTopic[]>;
  findAllWithUsers(): Promise<IgnoredTopic[]>;
}
