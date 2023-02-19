import esClient from '../../../services/elastic';

interface Params {
  from?: string;
  to?: string;
  board_id?: number;
  limit?: number;
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

export default class GetPostsTopicsPeriodService {
  public async execute({ from, to, board_id, limit }: Params): Promise<Data[]> {
    const matches = [
      {
        range: {
          date: {
            gte: from,
            lte: to
          }
        }
      }
    ] as any[];

    if (board_id) {
      matches.push({
        match: {
          board_id
        }
      });
    }

    const dataRaw = await esClient.search({
      index: 'posts',
      size: 0,
      track_total_hits: true,
      body: {
        query: {
          bool: {
            must: matches
          }
        },
        aggs: {
          topics: {
            terms: {
              field: 'topic_id',
              size: Math.min(limit ?? 10, 1000)
            },
            aggs: {
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
      topic_id: topic.key
    }));

    return data;
  }
}
