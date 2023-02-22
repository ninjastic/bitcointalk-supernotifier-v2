import TrackedTopic from '../infra/typeorm/entities/TrackedTopic';
import CreateTrackedTopicDTO from '../dtos/CreateTrackedTopicDTO';
import User from '../../users/infra/typeorm/entities/User';

export type TrackedTopicWithReturningUser = TrackedTopic & User;

export default interface ITrackedsTopicsRepository {
  create(data: CreateTrackedTopicDTO): TrackedTopic;
  save(trackedTopic: TrackedTopic): Promise<TrackedTopic>;
  findOneByTopicId(topic_id: number): Promise<TrackedTopic | undefined>;
  findOneByPostId(post_id: number): Promise<TrackedTopic | undefined>;
  findAllByTelegramId(telegram_id: string): Promise<TrackedTopic[]>;
  findAllWithUsers(): Promise<TrackedTopic[]>;
  findAllReturningUsers(): Promise<TrackedTopicWithReturningUser[]>;
}
