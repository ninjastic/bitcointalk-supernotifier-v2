import { container } from 'tsyringe';

import GetCacheService from '../../../container/providers/services/GetCacheService';
import SaveCacheService from '../../../container/providers/services/SaveCacheService';
import esClient from '../../../services/elastic';

interface Params {
  author_uid: number;
  from?: string;
  to?: string;
  limit?: number;
}

interface Response {
  title: string;
  topic_id: number;
  count: number;
}

export default class GetUserTopTopicsService {
  public async execute({ author_uid, from, to, limit }: Params): Promise<Response[]> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);

    const actualLimit = Math.min(limit || 5, 10);

    const cachedData = await getCache.execute<Response[]>(`userTopTopics:${author_uid}:${from}:${to}:${actualLimit}`);

    if (cachedData) {
      return cachedData;
    }

    const dataRaw = await esClient.search({
      index: 'posts',
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          must: [
            {
              term: {
                author_uid: {
                  value: author_uid,
                },
              },
            },
            {
              range: {
                date: {
                  gte: from,
                  lte: to,
                },
              },
            },
          ],
        },
      },
      aggs: {
        topics: {
          terms: {
            field: 'topic_id',
            size: actualLimit,
          },
          aggs: {
            data: {
              top_hits: {
                size: 1,
                _source: {
                  includes: ['title'],
                },
              },
            },
          },
        },
      },
    });

    const data = (dataRaw.aggregations.topics as any).buckets.map(topic => ({
      title: topic.data.hits.hits[0]._source.title,
      topic_id: topic.key,
      count: topic.doc_count,
    }));

    await saveCache.execute(`userTopTopics:${author_uid}:${from}:${to}:${actualLimit}`, data, 'EX', 600);

    return data;
  }
}
