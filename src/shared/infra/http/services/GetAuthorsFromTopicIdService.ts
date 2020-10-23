import esClient from '../../../services/elastic';

export default class GetAuthorsFromTopicIdService {
  public async execute({ topic_id }: { topic_id: number }): Promise<any> {
    const dataRaw = await esClient.search({
      index: 'posts',
      size: 0,
      track_total_hits: true,
      body: {
        query: {
          match: {
            topic_id,
          },
        },
        aggs: {
          authors: {
            terms: {
              field: 'author.keyword',
              size: 1000,
            },
            aggs: {
              author_uid: {
                terms: {
                  field: 'author_uid',
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
        author_uid: author.author_uid.buckets[0].key,
        count: author.doc_count,
      };
    });

    return data;
  }
}
