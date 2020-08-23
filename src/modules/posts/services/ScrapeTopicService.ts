import { injectable, container, inject } from 'tsyringe';

import api from '../../../shared/services/api';
import Post from '../infra/typeorm/entities/Post';

import IPostsRepository from '../repositories/IPostsRepository';
import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';

import ParseTopicService from './ParseTopicService';
import GetPostService from './GetPostService';
import SavePostService from './SavePostService';

@injectable()
export default class ScrapeTopicService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,

    @inject('CacheRepository')
    private cacheProvider: ICacheProvider,
  ) {}

  public async execute(topic_id: number): Promise<Post | null> {
    const parseTopic = container.resolve(ParseTopicService);
    const getPost = container.resolve(GetPostService);
    const savePost = container.resolve(SavePostService);

    const response = await api.get(`index.php?topic=${topic_id}`);

    const post = parseTopic.execute({
      html: response.data,
      topic_id,
    });

    const postExists = await this.postsRepository.findOneByPostId(post.post_id);

    if (!postExists) {
      return savePost.execute(post);
    }

    return post;
  }
}
