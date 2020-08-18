import Merit from '../infra/typeorm/entities/Merit';

export default interface IScrapeMeritsRepository {
  scrapeMerits(): Promise<void>;
  parseMeritElement(element: CheerioElement): Promise<Merit>;
}
