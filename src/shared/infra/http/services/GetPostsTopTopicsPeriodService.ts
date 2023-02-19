import esClient from '../../../services/elastic';

interface Params {
  from?: string;
  to?: string;
}

interface Data {
  title: string;
  topic_id: number;
  timestamps: Array<{
    key_as_string: string;
    key: number;
    doc_count: number;
  }>;
}

export default class GetPostsTopTopicsPeriodService {
  public async execute({ from, to }: Params): Promise<Data[]> {
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
                    lte: to
                  }
                }
              }
            ]
          }
        },
        aggs: {
          topics: {
            terms: {
              field: 'topic_id',
              size: 10
            },
            aggs: {
              date: {
                date_histogram: {
                  field: 'date',
                  calendar_interval: '1h',
                  extended_bounds: {
                    min: from,
                    max: to
                  }
                }
              },
              title: {
                top_hits: {
                  size: 1,
                  _source: {
                    includes: ['title']
                  }
                }
              }
            }
          }
        }
      }
    });

    const data = dataRaw.body.aggregations.topics.buckets.map(topic => ({
      title: topic.title.hits.hits[0]._source.title,
      topic_id: topic.key,
      timestamps: topic.date.buckets
    }));

    return data;
  }
}
