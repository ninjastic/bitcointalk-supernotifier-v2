import { container } from 'tsyringe';

import IUsersRepository from '../../modules/users/repositories/IUsersRepository';
import UsersRepository from '../../modules/users/infra/typeorm/repositories/UsersRepository';

import IIgnoredUserRepository from '../../modules/users/repositories/IIgnoredUserRepository';
import IgnoredUserRepository from '../../modules/users/infra/typeorm/repositories/IgnoredUserRepository';

import IPostsRepository from '../../modules/posts/repositories/IPostsRepository';
import PostsRepository from '../../modules/posts/infra/typeorm/repositories/PostsRepository';

import ITrackedTopicsRepository from '../../modules/posts/repositories/ITrackedTopicsRepository';
import TrackedTopicsRepository from '../../modules/posts/infra/typeorm/repositories/TrackedTopicsRepository';

import IIgnoredTopicsRepository from '../../modules/posts/repositories/IIgnoredTopicsRepository';
import IgnoredTopicsRepository from '../../modules/posts/infra/typeorm/repositories/IgnoredTopicsRepository';

import IMeritsRepository from '../../modules/merits/repositories/IMeritsRepository';
import MeritsRepository from '../../modules/merits/infra/typeorm/repositories/MeritsRepository';

import IModLogRepository from '../../modules/modlog/repositories/IModLogRepository';
import ModLogRepository from '../../modules/modlog/infra/typeorm/repositories/ModLogRepository';

import IReportRepository from '../../modules/reports/repositories/IReportRepository';
import ReportRepository from '../../modules/reports/infra/typeorm/repositories/ReportRepository';

import ICacheRepository from './providers/models/ICacheProvider';
import RedisProvider from './providers/implementations/RedisProvider';

container.registerSingleton<IUsersRepository>(
  'UsersRepository',
  UsersRepository,
);

container.registerSingleton<IIgnoredUserRepository>(
  'IgnoredUserRepository',
  IgnoredUserRepository,
);

container.registerSingleton<IPostsRepository>(
  'PostsRepository',
  PostsRepository,
);

container.registerSingleton<ITrackedTopicsRepository>(
  'TrackedTopicsRepository',
  TrackedTopicsRepository,
);

container.registerSingleton<IIgnoredTopicsRepository>(
  'IgnoredTopicsRepository',
  IgnoredTopicsRepository,
);

container.registerSingleton<IMeritsRepository>(
  'MeritsRepository',
  MeritsRepository,
);

container.registerSingleton<IModLogRepository>(
  'ModLogRepository',
  ModLogRepository,
);

container.registerSingleton<IReportRepository>(
  'ReportRepository',
  ReportRepository,
);

container.registerSingleton<ICacheRepository>('CacheRepository', RedisProvider);
