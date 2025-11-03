import type { Repository } from 'typeorm';
import { getRepository } from 'typeorm';

import type CreateTrackedTopicDTO from '../../../dtos/CreateTrackedTopicDTO';

import TrackedTopic from '../entities/TrackedTopic';
import type { TrackedTopicWithReturningUser } from '../../../repositories/ITrackedTopicsRepository';
import type ITrackedTopicsRepository from '../../../repositories/ITrackedTopicsRepository';

export default class TrackedTopicsRepository implements ITrackedTopicsRepository {
  private ormRepository: Repository<TrackedTopic>;

  constructor() {
    this.ormRepository = getRepository(TrackedTopic);
  }

  public create(data: CreateTrackedTopicDTO): TrackedTopic {
    const trackedTopic = this.ormRepository.create(data);
    return trackedTopic;
  }

  public async save(trackedTopic: TrackedTopic): Promise<TrackedTopic> {
    const savedTrackedTopic = await this.ormRepository.save(trackedTopic);
    return savedTrackedTopic;
  }

  public async findOneByTopicId(topic_id: number): Promise<TrackedTopic | null> {
    const trackedTopic = await this.ormRepository.findOne({
      where: {
        topic_id
      },
      relations: ['post']
    });

    return trackedTopic;
  }

  public async findOneByPostId(post_id: number): Promise<TrackedTopic | null> {
    const trackedTopic = await this.ormRepository.findOne({
      where: {
        post_id
      },
      relations: ['post']
    });

    return trackedTopic;
  }

  public async findAllByTelegramId(telegram_id: string): Promise<TrackedTopic[]> {
    const trackedTopics = await this.ormRepository.find({
      relations: ['post']
    });

    const filtered = trackedTopics.filter(topic => topic.tracking.includes(telegram_id));
    return filtered;
  }

  public async findAllWithUsers(): Promise<TrackedTopic[]> {
    const trackedTopics = await this.ormRepository.find({ where: 'array_length(tracking, 1) > 0' });

    return trackedTopics;
  }

  public async findAllReturningUsers(): Promise<TrackedTopicWithReturningUser[]> {
    const trackedTopics = await this.ormRepository
      .createQueryBuilder()
      .select('*')
      .from('tracked_topics', 'tracked_topics')
      .leftJoin('users', 'users', 'users.telegram_id = ANY(tracked_topics.tracking)')
      .where('array_length(tracked_topics.tracking, 1) > 0')
      .execute();

    return trackedTopics;
  }
}
