import Merit from '../infra/typeorm/entities/Merit';

export default interface IScrapeMeritsRepository {
  scrapeMerits(): Promise<number>;
  parseMeritElement(element: cheerio.Element): Promise<Merit>;
}
