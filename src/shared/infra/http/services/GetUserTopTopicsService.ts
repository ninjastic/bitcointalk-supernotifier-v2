import esClient from '../../../services/elastic';

export default class GetUserTopTopicsService {
  public async execute(
    username: string,
    from?: string,
    to?: string,
  ): Promise<any> {
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
                  'author.keyword': {
                    value: username,
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

    const response = {
      timed_out: dataRaw.body.timed_out,
      result: 'success',
      data,
    };

    return response;
  }
}
