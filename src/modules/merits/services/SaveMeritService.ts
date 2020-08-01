import { inject, injectable } from 'tsyringe';

import Merit from '../infra/schemas/Merit';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import IMeritsRepository from '../repositories/IMeritsRepository';

@injectable()
export default class SavePostService {
  constructor(
    @inject('MeritsRepository')
    private meritsRepository: IMeritsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(merit: Merit): Promise<Merit> {
    const cachedMerit = await this.cacheRepository.recover<Merit>(
      `merit:${merit.date}-${merit.amount}-${merit.post_id}`,
    );

    if (cachedMerit) {
      return cachedMerit;
    }

    const foundMerit = await this.meritsRepository.findOne(merit);

    if (foundMerit) {
      return foundMerit;
    }

    const savedMerit = await this.meritsRepository.save(merit);

    await this.cacheRepository.save(
      `merit:${merit.date}-${merit.amount}-${merit.post_id}`,
      JSON.stringify(merit),
      'EX',
      180,
    );

    return savedMerit;
  }
}
