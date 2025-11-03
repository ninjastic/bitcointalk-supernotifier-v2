import type { Repository } from 'typeorm';
import { getRepository } from 'typeorm';

import type CreateIgnoredTopicDTO from '../../../dtos/CreateIgnoredTopicDTO';

import IgnoredTopic from '../entities/IgnoredTopic';
import type IIgnoredTopicsRepository from '../../../repositories/IIgnoredTopicsRepository';

export default class IgnoredTopicsRepository implements IIgnoredTopicsRepository {
  private ormRepository: Repository<IgnoredTopic>;

  constructor() {
    this.ormRepository = getRepository(IgnoredTopic);
  }

  public create(data: CreateIgnoredTopicDTO): IgnoredTopic {
    return this.ormRepository.create(data);
  }

  public async save(ignoredTopic: IgnoredTopic): Promise<IgnoredTopic> {
    return this.ormRepository.save(ignoredTopic);
  }

  public async findOneByTopicId(topic_id: number): Promise<IgnoredTopic> {
    return this.ormRepository.findOne({
      where: { topic_id },
      relations: ['post']
    });
  }

  public async findOneByPostId(post_id: number): Promise<IgnoredTopic | null> {
    const ignoredTopic = await this.ormRepository.findOne({
      where: {
        post_id
      },
      relations: ['post']
    });

    return ignoredTopic;
  }

  public async findAllByTelegramId(telegram_id: string): Promise<IgnoredTopic[]> {
    const ignoredTopics = await this.ormRepository.find({
      relations: ['post']
    });

    const filteredIgnoredTopics = ignoredTopics.filter(topic => topic.ignoring.includes(telegram_id));
    return filteredIgnoredTopics;
  }

  public async findAllWithUsers(): Promise<IgnoredTopic[]> {
    const ignoredTopics = await this.ormRepository.find();

    const filteredIgnoredTopics = ignoredTopics.filter(topic => topic.ignoring.length);
    return filteredIgnoredTopics;
  }
}
