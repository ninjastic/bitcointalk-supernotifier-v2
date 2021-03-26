import bodybuilder from 'bodybuilder';
import cheerio from 'cheerio';

import esClient from '../../../services/elastic';

import Post from '../../../../modules/posts/infra/typeorm/entities/Post';

interface Data {
  post: Post;
  socials: {
    telegram: string | null;
    twitter: string | null;
    facebook: string | null;
  };
}

interface Params {
  authorUid: number;
}

class GetUserSocials {
  public async execute({ authorUid }: Params): Promise<Data[]> {
    const queryBuilder = bodybuilder();

    queryBuilder.query('match', 'author_uid', authorUid);
    queryBuilder.query('terms', 'board_id', [238, 52]); // bounty, services board

    const body = queryBuilder.build();

    const response = await esClient.search({
      index: 'posts',
      track_total_hits: true,
      size: 10000,
      body,
    });

    const posts = response.body.hits.hits.map(raw => raw._source);

    const data = posts
      .map(post => {
        const $ = cheerio.load(post.content);
        const postContent = $('*');
        postContent.children('div.quoteheader').remove();
        postContent.children('div.quote').remove();

        const contentWithoutQuotes = postContent.html();

        const telegram = contentWithoutQuotes.match(/telegram .*: @(\w+)/i);
        const twitter = contentWithoutQuotes.match(/twitter\.com\/(\w+)/i);
        const facebook = contentWithoutQuotes.match(
          /facebook\.com\/(?=(\w+))(?!story)/i,
        );

        if (!twitter && !telegram && !facebook) {
          return null;
        }

        return {
          post,
          socials: {
            telegram: (telegram && telegram[1]) || null,
            twitter: (twitter && twitter[1]) || null,
            facebook:
              (facebook && facebook[1]) || (facebook && facebook[2]) || null,
          },
        };
      })
      .filter(e => e);

    return data;
  }
}

export default GetUserSocials;
