import esClient from '../../../services/elastic';

interface Params {
  username: string;
  from?: string;
  to?: string;
}

export default class GetUserTopTopicsService {
  public async execute({ username, from, to }: Params): Promise<any> {
    const dataUsername = await esClient.search({
      index: 'posts',
      track_total_hits: true,
      _source: ['author', 'author_uid'],
      size: 1,
      body: {
        query: {
          match: {
            author: username,
          },
        },
      },
    });

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
                    value: dataUsername.body.hits.hits[0]?._source.author_uid,
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

    return data;
  }
}
