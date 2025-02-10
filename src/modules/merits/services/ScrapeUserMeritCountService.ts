import { load } from 'cheerio';

import api from '../../../shared/services/api';

export default class ScrapeUserMeritCountService {
  public async execute(uid: number): Promise<number> {
    const response = await api.get(`index.php?action=profile;u=${uid}`);
    const $ = load(response.data, { decodeEntities: true });

    const meritsCount = Number(
      $("b > a[href*='/index.php?action=merit;u=']").parent().parent().parent().find('td:nth-child(2)').text()
    );

    return meritsCount;
  }
}
