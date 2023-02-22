import { inject, injectable } from 'tsyringe';

import IMeritsRepository from '../repositories/IMeritsRepository';
import FindMeritDTO from '../dtos/FindMeritDTO';

@injectable()
export default class SetMeritNotifiedService {
  constructor(
    @inject('MeritsRepository')
    private meritsRepository: IMeritsRepository
  ) {}

  public async execute(data: FindMeritDTO, telegram_id: string): Promise<void> {
    const merit = await this.meritsRepository.findOne(data);

    merit.notified = true;
    merit.notified_to.push(telegram_id);

    await this.meritsRepository.save(merit);
  }
}
