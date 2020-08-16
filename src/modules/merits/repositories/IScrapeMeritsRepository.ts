import Merit from '../infra/schemas/Merit';

export default interface IScrapeMeritsRepository {
  scrapeMerits(): Promise<void>;
  parseMeritElement(element: CheerioElement): Promise<Merit>;
}
