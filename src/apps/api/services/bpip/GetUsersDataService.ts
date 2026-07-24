import { addMinutes, sub } from 'date-fns';

import GetAddressesTopUniqueService from '../GetAddressesTopUniqueService';
import GetTopicsUniqueService from '../GetTopicsUniqueService';
import GetUserTopTopicsService from '../GetUserTopTopicsService';

interface Params {
  scope: Array<string>;
  items: Array<string>;
}

interface Data {
  unique_topics?: number;
  addresses?: Array<{
    address: string;
    coin: string;
    count: number;
  }>;
}

export default class GetUsersDataService {
  public async execute({ scope, items }: Params): Promise<Data> {
    const getTopicsUnique = new GetTopicsUniqueService();
    const getAddressesTopUnique = new GetAddressesTopUniqueService();
    const getUserTopTopics = new GetUserTopTopicsService();

    const date = new Date();
    const dateUTC = addMinutes(date, date.getTimezoneOffset());

    const data = {};

    items.forEach((item) => {
      data[item] = {};
    });

    if (scope.includes('[UT]')) {
      await Promise.all(
        items.map(async (item) => {
          const { unique_topics } = await getTopicsUnique.execute({
            author_uid: Number(item),
          });
          data[item].unique_topics = unique_topics;
        }),
      );
    }

    if (scope.includes('[AD]')) {
      await Promise.all(
        items.map(async (item) => {
          const { addresses } = await getAddressesTopUnique.execute({
            author_uid: Number(item),
            limit: 5,
          });

          data[item].addresses = addresses;
        }),
      );
    }

    if (scope.includes('[FT]')) {
      await Promise.all(
        items.map(async (item) => {
          const topics = await getUserTopTopics.execute({
            author_uid: Number(item),
            from: sub(dateUTC, { days: 120 }).toISOString(),
            limit: 5,
          });

          data[item].topics = topics;
        }),
      );
    }

    return data;
  }
}
