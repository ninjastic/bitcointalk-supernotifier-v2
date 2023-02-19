import { inject, injectable } from 'tsyringe';

import IMeritsRepository from '../repositories/IMeritsRepository';
import FindMeritDTO from '../dtos/FindMeritDTO';

@injectable()
export default class SetMeritCheckedService {
  constructor(
    @inject('MeritsRepository')
    private meritsRepository: IMeritsRepository
  ) {}

  public async execute(data: FindMeritDTO): Promise<void> {
    const merit = await this.meritsRepository.findOne({
      amount: data.amount,
      date: data.date,
      post_id: data.post_id,
      sender_uid: data.sender_uid
    });

    merit.checked = true;

    await this.meritsRepository.save(merit);
  }
}
