import { inject, injectable } from 'tsyringe';

import type Post from '../../../../modules/posts/infra/typeorm/entities/Post';
import type IPostsRepository from '../../../../modules/posts/repositories/IPostsRepository';
import type ITrackedTopicsRepository from '../../../../modules/posts/repositories/ITrackedTopicsRepository';
import type ICacheProvider from '../../../container/providers/models/ICacheProvider';

@injectable()
export default class FindPostByTrackedTopicService {
  constructor(
    @inject('TrackedTopicsRepository')
    private trackedTopicsRepository: ITrackedTopicsRepository,

    @inject('PostsRepository')
    private postsRepository: IPostsRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute({ topic_id }: { topic_id: number }): Promise<Post> {
    const cachedPost = await this.cacheRepository.recover<Post>(`trackedTopics:topicId:${topic_id}`);

    if (cachedPost) {
      return cachedPost;
    }

    const trackedTopic = await this.trackedTopicsRepository.findOneByTopicId(topic_id);

    const post = await this.postsRepository.findOneByPostId(trackedTopic.post_id);

    await this.cacheRepository.save(`trackedTopics:topicId:${topic_id}`, post);

    return post;
  }
}
