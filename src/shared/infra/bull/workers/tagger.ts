import 'reflect-metadata';
import 'module-alias/register';
import 'dotenv/config';
import PostsRepository from '##/modules/posts/infra/typeorm/repositories/PostsRepository';
import { campaignPostsChecker } from '##/modules/posts/services/checkers/posts/ai/campaignPosts';
import { container } from 'tsyringe';
import { createConnection } from 'typeorm';
import TopicRepository from '##/modules/posts/infra/typeorm/repositories/TopicRepository';

const tagger = async () => {
  await createConnection();

  const postsRepository = container.resolve(TopicRepository);

  const posts = await postsRepository.findPosts({ topic_id: 5519391, limit: 1, order: 'ASC' });

  await campaignPostsChecker({ posts });
};

tagger();
