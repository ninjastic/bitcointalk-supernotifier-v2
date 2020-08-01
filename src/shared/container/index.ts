import { container } from 'tsyringe';

import IPostsRepository from '../../modules/posts/repositories/IPostsRepository';
import PostsRepository from '../../modules/posts/infra/repositories/PostsRepository';

import IMeritsRepository from '../../modules/merits/repositories/IMeritsRepository';
import MeritsRepository from '../../modules/merits/infra/repositories/MeritsRepository';

import ICacheRepository from './providers/models/ICacheProvider';
import RedisProvider from './providers/implementations/RedisProvider';

container.registerSingleton<IPostsRepository>(
  'PostsRepository',
  PostsRepository,
);

container.registerSingleton<IMeritsRepository>(
  'MeritsRepository',
  MeritsRepository,
);

container.registerSingleton<ICacheRepository>('CacheRepository', RedisProvider);
