import { inject, injectable } from 'tsyringe';

import Merit from '../infra/typeorm/entities/Merit';

import IMeritsRepository from '../repositories/IMeritsRepository';

interface Params {
  author_uid: number;
}

@injectable()
export default class GetUserMeritCountOnPeriodService {
  constructor(
    @inject('MeritsRepository')
    private meritsRepository: IMeritsRepository,
  ) {}

  public async execute({ author_uid }: Params): Promise<Merit[]> {
    return this.meritsRepository.getAmountByUserOnPeriod(author_uid);
  }
}
