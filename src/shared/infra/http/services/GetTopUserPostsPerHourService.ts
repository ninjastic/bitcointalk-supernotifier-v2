import esClient from '../../../services/elastic';

interface Params {
  from?: string;
  to?: string;
}

export default class GetTopUserPostsPerHourService {
  public async execute({ from, to }: Params): Promise<any> {
    const dataRaw = await esClient.search({
      index: 'posts',
      size: 0,
      track_total_hits: true,
      body: {
        query: {
          bool: {
            must: [
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
          authors: {
            terms: {
              field: 'author.keyword',
              size: 10,
            },
            aggs: {
              date: {
                date_histogram: {
                  field: 'date',
                  fixed_interval: '1h',
                  extended_bounds: {
                    min: from,
                    max: to,
                  },
                },
              },
            },
          },
        },
      },
    });

    const data = dataRaw.body.aggregations.authors.buckets.map(author => {
      return {
        author: author.key,
        timestamps: author.date.buckets,
      };
    });

    return data;
  }
}
