import { container } from 'tsyringe';

import IScrapeMeritsRepository from '../../repositories/IScrapeMeritsRepository';

import Merit from '../schemas/Merit';

import ScrapeMeritsService from '../../services/ScrapeMeritsService';
import ParseMeritElementService from '../../services/ParseMeritElementService';
import SaveMeritService from '../../services/SaveMeritService';

export default class ScrapeMeritsRepository implements IScrapeMeritsRepository {
  public async scrapeMerits(): Promise<void> {
    const scrapeMerits = new ScrapeMeritsService();
    const saveMerit = container.resolve(SaveMeritService);

    const merits = await scrapeMerits.execute();

    merits.forEach(async merit => {
      await saveMerit.execute(merit);
    });
  }

  public async parseMeritElement(element: CheerioElement): Promise<Merit> {
    const parseMeritElement = container.resolve(ParseMeritElementService);
    const merit = await parseMeritElement.execute(element);

    return merit;
  }
}
