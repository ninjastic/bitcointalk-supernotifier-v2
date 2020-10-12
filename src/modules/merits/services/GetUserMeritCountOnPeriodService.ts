import { inject, injectable } from 'tsyringe';

import Merit from '../infra/typeorm/entities/Merit';

import IMeritsRepository from '../repositories/IMeritsRepository';

@injectable()
export default class GetUserMeritCountOnPeriodService {
  constructor(
    @inject('MeritsRepository')
    private meritsRepository: IMeritsRepository,
  ) {}

  public async execute({ username }: { username: string }): Promise<Merit[]> {
    return this.meritsRepository.getAmountByUserOnPeriod(username);
  }
}
