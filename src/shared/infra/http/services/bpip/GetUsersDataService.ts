import GetTopicsUniqueService from '../GetTopicsUniqueService';
import GetAddressesTopUniqueService from '../GetAddressesTopUniqueService';

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

    const data = {};

    items.forEach(item => {
      data[item] = {};
    });

    if (scope.includes('[UT]')) {
      await Promise.all(
        items.map(async item => {
          const { unique_topics } = await getTopicsUnique.execute({
            author_uid: Number(item),
          });
          data[item].unique_topics = unique_topics;
        }),
      );
    }

    if (scope.includes('[AD]')) {
      await Promise.all(
        items.map(async item => {
          const { addresses } = await getAddressesTopUnique.execute({
            author_uid: Number(item),
            limit: 5,
          });

          data[item].addresses = addresses;
        }),
      );
    }

    return data;
  }
}
