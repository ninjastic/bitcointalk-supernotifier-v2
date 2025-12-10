import { container } from 'tsyringe';

import GetCacheService from '../../../container/providers/services/GetCacheService';
import SaveCacheService from '../../../container/providers/services/SaveCacheService';
import esClient from '../../../services/elastic';

interface SearchResponse {
  aggregations: {
    unique_topics: {
      value: number;
    };
  };
}

interface Data {
  unique_topics: number;
}

interface Params {
  author_uid: number;
  from?: string;
  to?: string;
}

export default class GetTopicsUniqueService {
  public async execute({ author_uid, from, to }: Params): Promise<Data> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const cachedData = await getCache.execute<Data>(`users:Topics:${author_uid}:${from}:${to}`);

    if (cachedData) {
      return cachedData;
    }

    const results = await esClient.search<SearchResponse>({
      index: 'posts',
      track_total_hits: true,
      size: 0,
      query: {
        bool: {
          must: [
            {
              match: {
                author_uid,
              },
            },
            {
              range: {
                date: { gte: from || null, lte: to || null },
              },
            },
          ],
        },
      },
      aggs: {
        unique_topics: {
          cardinality: {
            field: 'topic_id',
          },
        },
      },
    });

    const data = {
      unique_topics: (results.aggregations.unique_topics as { value: number }).value,
    };

    await saveCache.execute(`users:Topics:${author_uid}:${from}:${to}`, data, 'EX', 600);

    return data;
  }
}
