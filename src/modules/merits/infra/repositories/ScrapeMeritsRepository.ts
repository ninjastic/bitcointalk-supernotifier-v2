import { container } from 'tsyringe';

import IScrapeMeritsRepository from '../../repositories/IScrapeMeritsRepository';

import Merit from '../schemas/Merit';

import ScrapeMeritsService from '../../services/ScrapeMeritsService';
import ScrapeMeritElementService from '../../services/ScrapeMeritElementService';
import SaveMeritService from '../../services/SaveMeritService';

export default class ScrapeMeritsRepository implements IScrapeMeritsRepository {
  public async scrapeMerits(): Promise<void> {
    const scrapeMerits = new ScrapeMeritsService();
    const saveMerit = container.resolve(SaveMeritService);

    const merits = await scrapeMerits.execute();

    console.log(merits);

    merits.forEach(async merit => {
      await saveMerit.execute(merit);
    });
  }

  public async scrapeMeritElement(element: CheerioElement): Promise<Merit> {
    const scrapeMeritElement = container.resolve(ScrapeMeritElementService);
    const merit = await scrapeMeritElement.execute(element);

    return merit;
  }
}
