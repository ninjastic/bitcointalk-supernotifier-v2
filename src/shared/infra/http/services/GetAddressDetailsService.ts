import axios from 'axios';
import { container } from 'tsyringe';

import GetCacheService from '../../../container/providers/services/GetCacheService';
import SaveCacheService from '../../../container/providers/services/SaveCacheService';

interface Params {
  address: string;
  route: string;
}

export default class GetAddressDetailsService {
  public async execute({ address, route }: Params): Promise<any> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    if (address.startsWith('0x')) {
      if (!route) {
        throw new Error('Route is missing');
      }

      const cachedData = await getCache.execute(`addressDetails:${address}:${route}`);

      if (cachedData) {
        return cachedData;
      }

      const { data } = await axios.get(`https://api.ethplorer.io/${route}/${address}`, {
        params: {
          apiKey: process.env.ETHPLORER_APIKEY,
          type: 'transfer'
        }
      });

      await saveCache.execute(`addressDetails:${address}:${route}`, data, 'EX', 300);

      return data;
    }

    const cachedData = await getCache.execute(`addressDetails:${address}`);

    if (cachedData) {
      return cachedData;
    }

    const { data } = await axios.get(`https://www.sochain.com/api/v2/get_address_balance/bitcoin/${address}`);

    await saveCache.execute(`addressDetails:${address}`, data, 'EX', 300);

    return data;
  }
}
