import { sub } from 'date-fns';
import { getRepository, Repository } from 'typeorm';

import ICreateTopicDTO from '../../../dtos/ICreateTopicDTO';

import Topic from '../entities/Topic';

export default class TopicRepository {
  private ormRepository: Repository<Topic>;

  constructor() {
    this.ormRepository = getRepository(Topic);
  }

  public create(data: ICreateTopicDTO): Topic {
    return this.ormRepository.create(data);
  }

  public async save(topic: Topic): Promise<Topic> {
    return this.ormRepository.save(topic);
  }

  public async findUncheckedAndUnnotified(): Promise<Topic[]> {
    return this.ormRepository
      .createQueryBuilder('topics')
      .innerJoinAndSelect('topics.post', 'post')
      .where('post.checked = :checked AND post.notified = :notified AND post.date >= :date', {
        checked: false,
        notified: false,
        date: sub(new Date(), { minutes: 30 })
      })
      .getMany();
  }
}
