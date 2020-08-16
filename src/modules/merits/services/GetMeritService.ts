import { inject, injectable } from 'tsyringe';

import Merit from '../infra/schemas/Merit';

import IMeritsRepository from '../repositories/IMeritsRepository';
import FindMeritDTO from '../dtos/FindMeritDTO';

@injectable()
export default class GetMeritService {
  constructor(
    @inject('MeritsRepository')
    private meritsRepository: IMeritsRepository,
  ) {}

  public async execute(data: FindMeritDTO): Promise<Merit> {
    const merit = await this.meritsRepository.findOne({
      amount: data.amount,
      date: data.date,
      post_id: data.post_id,
    });

    return merit;
  }
}
