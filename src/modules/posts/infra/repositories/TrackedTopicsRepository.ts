import { getRepository, Repository, In } from 'typeorm';

import CreateTrackedTopicDTO from '../../dtos/CreateTrackedTopicDTO';

import TrackedTopic from '../typeorm/entities/TrackedTopic';
import ITrackedTopicsRepository from '../../repositories/ITrackedTopicsRepository';

export default class TrackedTopicsRepository
  implements ITrackedTopicsRepository {
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

  public async findOne(topic_id: number): Promise<TrackedTopic | null> {
    const trackedTopic = await this.ormRepository.findOne({
      where: {
        topic_id,
      },
      relations: ['post'],
    });

    return trackedTopic;
  }

  public async findOneByPostId(post_id: number): Promise<TrackedTopic | null> {
    const trackedTopic = await this.ormRepository.findOne({
      where: {
        post_id,
      },
      relations: ['post'],
    });

    return trackedTopic;
  }

  public async findAllByTelegramId(
    telegram_id: number,
  ): Promise<TrackedTopic[]> {
    const trackedTopics = await this.ormRepository.find({
      relations: ['post'],
    });

    const filtered = trackedTopics.filter(topic =>
      topic.tracking.includes(telegram_id),
    );

    return filtered;
  }

  public async findAllWithUsers(): Promise<TrackedTopic[]> {
    const trackedTopics = await this.ormRepository.find();

    const filteredTrackedTopics = trackedTopics.filter(
      topic => topic.tracking.length,
    );

    return filteredTrackedTopics;
  }
}
