import Merit from '../infra/schemas/Merit';

export default interface IScrapeMeritsRepository {
  scrapeMerits(): Promise<void>;
  scrapeMeritElement(element: CheerioElement): Promise<Merit>;
}
