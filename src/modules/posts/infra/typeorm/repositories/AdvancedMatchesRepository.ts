import type { DeleteResult, Repository } from 'typeorm';

import { getRepository } from 'typeorm';

import type ICreateAdvancedMatchDTO from '../../../dtos/ICreateAdvancedMatchDTO';
import type IFindAdvancedMatchDTO from '../../../dtos/IFindAdvancedMatchDTO';
import type IAdvancedMatchesRepository from '../../../repositories/IAdvancedMatchesRepository';

import AdvancedMatch from '../entities/AdvancedMatch';

export default class AdvancedMatchesRepository implements IAdvancedMatchesRepository {
  private ormRepository: Repository<AdvancedMatch>;

  constructor() {
    this.ormRepository = getRepository(AdvancedMatch);
  }

  public create(data: ICreateAdvancedMatchDTO): AdvancedMatch {
    const { authors, board_ids, topic_ids, ...rest } = data;
    const match = this.ormRepository.create(rest);
    match.authors = (authors || []).map((a) => ({ author: a })) as any;
    match.boards = (board_ids || []).map((b) => ({ board_id: b })) as any;
    match.topics = (topic_ids || []).map((t) => ({ topic_id: t })) as any;
    return match;
  }

  public save(advancedMatch: AdvancedMatch): Promise<AdvancedMatch> {
    return this.ormRepository.save(advancedMatch);
  }

  public async find(conditions: IFindAdvancedMatchDTO): Promise<AdvancedMatch[]> {
    return this.ormRepository.find({
      where: conditions,
      relations: [
        'authors',
        'boards',
        'boards.board',
        'topics',
        'topics.topic',
        'topics.topic.post',
      ],
      order: { created_at: 'ASC' },
    });
  }

  public async findAll(): Promise<AdvancedMatch[]> {
    return this.ormRepository.find({
      relations: [
        'user',
        'authors',
        'boards',
        'boards.board',
        'topics',
        'topics.topic',
        'topics.topic.post',
      ],
      order: { created_at: 'ASC' },
    });
  }

  public async findOne(conditions: IFindAdvancedMatchDTO): Promise<AdvancedMatch> {
    return this.ormRepository.findOne({
      where: conditions,
      relations: [
        'user',
        'authors',
        'boards',
        'boards.board',
        'topics',
        'topics.topic',
        'topics.topic.post',
      ],
    });
  }

  public async delete(advancedMatch: AdvancedMatch): Promise<DeleteResult> {
    return this.ormRepository.delete({ id: advancedMatch.id });
  }
}
