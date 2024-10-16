import { injectable, inject } from 'tsyringe';
import esClient from '../../../services/elastic';

import ICacheProvider from '../../../container/providers/models/ICacheProvider';
import Post from '../../../../modules/posts/infra/typeorm/entities/Post';

interface Response {
  author_uid: number;
}

interface Params {
  username: string;
}

@injectable()
export default class GetAuthorUIDFromUsernameService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute({ username }: Params): Promise<Response> {
    const cachedData = await this.cacheRepository.recover<Response>(`authorUID:${username}`);

    if (cachedData) {
      return cachedData;
    }

    const author = await esClient.search<Post>({
      index: 'posts',
      _source: ['author', 'author_uid'],
      size: 1,
      query: {
        term: {
          'author.keyword': {
            value: username,
            case_insensitive: true
          }
        }
      }
    });

    if (!author.hits.hits.length) {
      return null;
    }

    const data = {
      author_uid: author.hits.hits[0]?._source.author_uid
    };

    await this.cacheRepository.save(`authorUID:${username}`, data);

    return data;
  }
}
