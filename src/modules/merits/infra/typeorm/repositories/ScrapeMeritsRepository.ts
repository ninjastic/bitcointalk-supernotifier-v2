import { container, injectable, inject } from 'tsyringe';

import { getManager } from 'typeorm';
import IScrapeMeritsRepository from '../../../repositories/IScrapeMeritsRepository';
import ICacheProvider from '../../../../../shared/container/providers/models/ICacheProvider';

import Merit from '../entities/Merit';

import ScrapeMeritsService from '../../../services/ScrapeMeritsService';
import ParseMeritElementService from '../../../services/ParseMeritElementService';

@injectable()
export default class ScrapeMeritsRepository implements IScrapeMeritsRepository {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async scrapeMerits(): Promise<void> {
    const scrapeMerits = new ScrapeMeritsService();

    const merits = await scrapeMerits.execute();

    const valuesToRecover = merits.map(merit => {
      return `merit:${new Date(merit.date)}-${merit.amount}-${merit.post_id}`;
    });

    const cached = await this.cacheRepository.recoverMany<Merit>(
      valuesToRecover,
    );

    const operations = [];

    merits.forEach(merit => {
      if (!merit.post_id) return;

      const found = cached.find(
        cache =>
          cache &&
          Date.parse(String(cache.date)) === Date.parse(String(merit.date)) &&
          cache.amount === merit.amount &&
          cache.post_id === merit.post_id,
      );

      if (!found) {
        operations.push(merit);
      }
    });

    if (!operations.length) {
      return;
    }

    await getManager()
      .createQueryBuilder()
      .insert()
      .into(Merit)
      .values(operations)
      .returning('*')
      .onConflict('("date", "amount", "post_id") DO NOTHING')
      .execute();

    const valuesToSet = [];

    merits.forEach((merit: Merit) => {
      if (!merit.post_id) return;

      valuesToSet.push({
        key: `merit:${new Date(merit.date)}-${merit.amount}-${merit.post_id}`,
        value: merit,
        arg: 'EX',
        time: 900,
      });
    });

    await this.cacheRepository.saveMany(valuesToSet);
  }

  public async parseMeritElement(element: CheerioElement): Promise<Merit> {
    const parseMeritElement = container.resolve(ParseMeritElementService);
    const merit = await parseMeritElement.execute(element);

    return merit;
  }
}
