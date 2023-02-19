import { inject, injectable } from 'tsyringe';

import Merit from '../infra/typeorm/entities/Merit';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import IMeritsRepository from '../repositories/IMeritsRepository';

@injectable()
export default class SaveMeritService {
  constructor(
    @inject('MeritsRepository')
    private meritsRepository: IMeritsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute(merit: Merit): Promise<Merit> {
    const cachedMerit = await this.cacheRepository.recover<Merit>(
      `merit:${merit.date}_${merit.amount}_${merit.post_id}_${merit.sender_uid}`
    );

    if (cachedMerit) {
      return cachedMerit;
    }

    const foundMerit = await this.meritsRepository.findOne({
      amount: merit.amount,
      date: merit.date,
      post_id: merit.post_id,
      sender_uid: merit.sender_uid
    });

    if (foundMerit) {
      return foundMerit;
    }

    const createdMerit = this.meritsRepository.create(merit);
    const savedMerit = await this.meritsRepository.save(createdMerit);

    await this.cacheRepository.save(
      `merit:${merit.date}_${merit.amount}_${merit.post_id}_${merit.sender_uid}`,
      savedMerit,
      'EX',
      300
    );

    return savedMerit;
  }
}
