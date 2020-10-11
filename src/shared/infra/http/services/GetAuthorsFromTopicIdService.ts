import esClient from '../../../services/elastic';

export default class GetAuthorsFromTopicIdService {
  public async execute(topic_id: number): Promise<any> {
    if (Number.isNaN(topic_id)) {
      throw new Error('topic_id is invalid');
    }

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
              size: 2000,
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

    const response = {
      timed_out: dataRaw.body.timed_out,
      result: 'success',
      data,
    };

    return response;
  }
}
