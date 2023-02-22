import { DeleteResult, getRepository, Repository } from 'typeorm';

import ICreateTrackedPhraseDTO from 'modules/posts/dtos/ICreateTrackedPhraseDTO';
import IFindTrackedPhraseDTO from 'modules/posts/dtos/IFindTrackedPhraseDTO';
import TrackedPhrase from '../entities/TrackedPhrase';

import ITrackedPhrasesRepository from '../../../repositories/ITrackedPhrasesRepository';

export default class TrackedPhrasesRepository implements ITrackedPhrasesRepository {
  private ormRepository: Repository<TrackedPhrase>;

  constructor() {
    this.ormRepository = getRepository(TrackedPhrase);
  }

  public create(data: ICreateTrackedPhraseDTO): TrackedPhrase {
    return this.ormRepository.create(data);
  }

  public save(trackedPhrase: TrackedPhrase): Promise<TrackedPhrase> {
    return this.ormRepository.save(trackedPhrase);
  }

  public async find(conditions: IFindTrackedPhraseDTO): Promise<TrackedPhrase[]> {
    return this.ormRepository.find({
      where: conditions
    });
  }

  public async findAll(): Promise<TrackedPhrase[]> {
    return this.ormRepository.find({
      relations: ['user']
    });
  }

  public async findOne(conditions: IFindTrackedPhraseDTO): Promise<TrackedPhrase> {
    return this.ormRepository.findOne({
      where: conditions
    });
  }

  public async delete(trackedPhrase: TrackedPhrase): Promise<DeleteResult> {
    return this.ormRepository.delete({ id: trackedPhrase.id });
  }
}
