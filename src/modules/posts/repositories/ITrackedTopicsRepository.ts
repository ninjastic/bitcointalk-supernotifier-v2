import TrackedTopic from '../infra/typeorm/entities/TrackedTopic';
import CreateTrackedTopicDTO from '../dtos/CreateTrackedTopicDTO';

export default interface ITrackedsTopicsRepository {
  create(data: CreateTrackedTopicDTO): TrackedTopic;
  save(trackedTopic: TrackedTopic): Promise<TrackedTopic>;
  findOne(topic_id: number): Promise<TrackedTopic | undefined>;
  findOneByPostId(post_id: number): Promise<TrackedTopic | undefined>;
  findAllByTelegramId(telegram_id: number): Promise<TrackedTopic[]>;
  findAllWithUsers(): Promise<TrackedTopic[]>;
}
