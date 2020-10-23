import { container } from 'tsyringe';
import esClient from '../../../services/elastic';

import GetCacheService from '../../../container/providers/services/GetCacheService';
import SaveCacheService from '../../../container/providers/services/SaveCacheService';
import GetAuthorInfoService from './GetAuthorInfoService';

interface Params {
  username: string;
  from?: string;
  to?: string;
}

interface Response {
  title: string;
  topic_id: number;
  count: number;
}

export default class GetUserTopTopicsService {
  public async execute({ username, from, to }: Params): Promise<Response[]> {
    const getCache = container.resolve(GetCacheService);
    const saveCache = container.resolve(SaveCacheService);
    const getAuthorInfo = container.resolve(GetAuthorInfoService);

    const cachedData = await getCache.execute<Response[]>(
      `userTopTopics:${username}:${from}:${to}`,
    );

    if (cachedData) {
      return cachedData;
    }

    const authorInfo = await getAuthorInfo.execute({ username });

    const dataRaw = await esClient.search({
      index: 'posts',
      size: 0,
      track_total_hits: true,
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  author_uid: {
                    value: authorInfo.author_uid,
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
              size: 5,
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
      },
    });

    const data = dataRaw.body.aggregations.topics.buckets.map(topic => {
      return {
        title: topic.data.hits.hits[0]._source.title,
        topic_id: topic.key,
        count: topic.doc_count,
      };
    });

    await saveCache.execute(
      `userTopTopics:${username}:${from}:${to}`,
      data,
      'EX',
      240,
    );

    return data;
  }
}
