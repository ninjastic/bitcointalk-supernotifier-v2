import { getMongoRepository, MongoRepository } from 'typeorm';

import CreateMeritDTO from '../../dtos/CreateMeritDTO';

import Merit from '../schemas/Merit';
import IMeritsRepository from '../../repositories/IMeritsRepository';

export default class MeritsRepository implements IMeritsRepository {
  private ormRepository: MongoRepository<Merit>;

  constructor() {
    this.ormRepository = getMongoRepository(Merit);
  }

  public create(data: CreateMeritDTO): Merit {
    const merit = this.ormRepository.create(data);

    return merit;
  }

  public async save(merit: Merit): Promise<Merit> {
    const meritSaved = await this.ormRepository.save(merit);

    return meritSaved;
  }

  public async findOne(merit: Merit): Promise<Merit> {
    const meritFound = await this.ormRepository.findOne({
      date: merit.date,
      amount: merit.amount,
      post_id: merit.post_id,
    });

    return meritFound;
  }
}
