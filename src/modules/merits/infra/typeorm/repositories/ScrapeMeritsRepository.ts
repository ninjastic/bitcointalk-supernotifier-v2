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
    private cacheRepository: ICacheProvider
  ) {}

  public async scrapeMerits(): Promise<number> {
    const scrapeMerits = new ScrapeMeritsService();
    const merits = await scrapeMerits.execute();

    const valuesToRecover = merits.map(
      merit => `merit:${new Date(merit.date)}_${merit.amount}_${merit.post_id}_${merit.sender_uid}`
    );

    const cached = await this.cacheRepository.recoverMany<Merit>(valuesToRecover);
    const operations = [];

    const meritsToAdd = merits.filter(
      merit =>
        !cached.find(cache => {
          if (!cache) {
            return false;
          }

          return (
            new Date(cache.date).toISOString() === new Date(merit.date).toISOString() &&
            cache.amount === merit.amount &&
            cache.post_id === merit.post_id &&
            cache.sender_uid === merit.sender_uid
          );
        })
    );

    if (meritsToAdd.length) {
      operations.push(...meritsToAdd);
    } else {
      return 0;
    }

    const inserted = await getManager()
      .createQueryBuilder()
      .insert()
      .into(Merit)
      .values(operations)
      .returning('*')
      .onConflict('("date", "amount", "post_id", "sender_uid") DO NOTHING')
      .execute();

    const valuesToSet = [];

    for (const merit of inserted.raw) {
      if (merit.post_id) {
        valuesToSet.push({
          key: `merit:${new Date(merit.date)}_${merit.amount}_${merit.post_id}_${merit.sender_uid}`,
          value: merit,
          arg: 'EX',
          time: 900
        });
      }
    }

    await this.cacheRepository.saveMany(valuesToSet);
    return inserted.raw.length;
  }

  public async parseMeritElement(element: cheerio.Element): Promise<Merit> {
    const parseMeritElement = container.resolve(ParseMeritElementService);
    const merit = await parseMeritElement.execute(element);
    return merit;
  }
}
