import { getRepository, Repository, MoreThanOrEqual } from 'typeorm';
import { sub } from 'date-fns';

import CreateMeritDTO from '../../../dtos/CreateMeritDTO';
import FindMeritDTO from '../../../dtos/FindMeritDTO';

import Merit from '../entities/Merit';
import IMeritsRepository from '../../../repositories/IMeritsRepository';

export default class MeritsRepository implements IMeritsRepository {
  private ormRepository: Repository<Merit>;

  constructor() {
    this.ormRepository = getRepository(Merit);
  }

  public create(data: CreateMeritDTO): Merit {
    const merit = this.ormRepository.create(data);

    return merit;
  }

  public async save(merit: Merit): Promise<Merit> {
    const meritSaved = await this.ormRepository.save(merit);

    return meritSaved;
  }

  public async findOne(data: FindMeritDTO): Promise<Merit> {
    const merit = await this.ormRepository.findOne({
      date: new Date(data.date),
      amount: data.amount,
      post_id: data.post_id,
      sender_uid: data.sender_uid,
    });

    return merit;
  }

  public async getLatestUncheckedMerits(limit: number): Promise<Merit[]> {
    const merits = await this.ormRepository.find({
      where: {
        checked: false,
        date: MoreThanOrEqual(sub(new Date(), { minutes: 30 })),
      },
      order: { created_at: -1 },
      take: limit,
    });

    return merits;
  }

  public async getAmountByUserOnPeriod(
    author_uid: number,
  ): Promise<Array<{ date: string; count: string }>> {
    return this.ormRepository.query(
      "SELECT date_trunc('day', date) as date, sum(amount) as amount FROM merits WHERE receiver_uid = $1 GROUP BY 1 ORDER BY 1;",
      [author_uid],
    );
  }
}
