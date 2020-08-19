import { container } from 'tsyringe';

import IUsersRepository from '../../modules/users/repositories/IUsersRepository';
import UsersRepository from '../../modules/users/infra/repositories/UsersRepository';

import IPostsRepository from '../../modules/posts/repositories/IPostsRepository';
import PostsRepository from '../../modules/posts/infra/repositories/PostsRepository';

import ITrackedTopicsRepository from '../../modules/posts/repositories/ITrackedTopicsRepository';
import TrackedTopicsRepository from '../../modules/posts/infra/repositories/TrackedTopicsRepository';

import IMeritsRepository from '../../modules/merits/repositories/IMeritsRepository';
import MeritsRepository from '../../modules/merits/infra/repositories/MeritsRepository';

import ICacheRepository from './providers/models/ICacheProvider';
import RedisProvider from './providers/implementations/RedisProvider';

container.registerSingleton<IUsersRepository>(
  'UsersRepository',
  UsersRepository,
);

container.registerSingleton<IPostsRepository>(
  'PostsRepository',
  PostsRepository,
);

container.registerSingleton<ITrackedTopicsRepository>(
  'TrackedTopicsRepository',
  TrackedTopicsRepository,
);

container.registerSingleton<IMeritsRepository>(
  'MeritsRepository',
  MeritsRepository,
);

container.registerSingleton<ICacheRepository>('CacheRepository', RedisProvider);
