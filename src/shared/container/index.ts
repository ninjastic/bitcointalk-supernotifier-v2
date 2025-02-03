import { container } from 'tsyringe';

import IUsersRepository from '../../modules/users/repositories/IUsersRepository';
import UsersRepository from '../../modules/users/infra/typeorm/repositories/UsersRepository';

import IIgnoredUserRepository from '../../modules/users/repositories/IIgnoredUserRepository';
import IgnoredUserRepository from '../../modules/users/infra/typeorm/repositories/IgnoredUserRepository';

import IPostsRepository from '../../modules/posts/repositories/IPostsRepository';
import PostsRepository from '../../modules/posts/infra/typeorm/repositories/PostsRepository';

import ITrackedTopicsRepository from '../../modules/posts/repositories/ITrackedTopicsRepository';
import TrackedTopicsRepository from '../../modules/posts/infra/typeorm/repositories/TrackedTopicsRepository';

import ITrackedTopicUsersRepository from '../../modules/posts/repositories/ITrackedTopicUsersRepository';
import TrackedTopicUsersRepository from '../../modules/posts/infra/typeorm/repositories/TrackedTopicUsersRepository';

import ITrackedPhrasesRepository from '../../modules/posts/repositories/ITrackedPhrasesRepository';
import TrackedPhrasesRepository from '../../modules/posts/infra/typeorm/repositories/TrackedPhrasesRepository';

import IIgnoredTopicsRepository from '../../modules/posts/repositories/IIgnoredTopicsRepository';
import IgnoredTopicsRepository from '../../modules/posts/infra/typeorm/repositories/IgnoredTopicsRepository';

import IMeritsRepository from '../../modules/merits/repositories/IMeritsRepository';
import MeritsRepository from '../../modules/merits/infra/typeorm/repositories/MeritsRepository';

import IModLogRepository from '../../modules/modlog/repositories/IModLogRepository';
import ModLogRepository from '../../modules/modlog/infra/typeorm/repositories/ModLogRepository';

import IAddressesRepository from '../../modules/posts/repositories/IAddressesRepository';
import AddressesRepository from '../../modules/posts/infra/typeorm/repositories/AddressesRepository';

import IPostsAddressesRepository from '../../modules/posts/repositories/IPostsAddressesRepository';
import PostsAddressesRepository from '../../modules/posts/infra/typeorm/repositories/PostsAddressesRepository';

import IPostsHistoryRepository from '../../modules/posts/repositories/IPostsHistoryRepository';
import PostsHistoryRepository from '../../modules/posts/infra/typeorm/repositories/PostsHistoryRepository';

import ICacheRepository from './providers/models/ICacheProvider';
import RedisProvider from './providers/implementations/RedisProvider';

container.registerSingleton<IUsersRepository>('UsersRepository', UsersRepository);

container.registerSingleton<IIgnoredUserRepository>('IgnoredUserRepository', IgnoredUserRepository);

container.registerSingleton<IPostsRepository>('PostsRepository', PostsRepository);

container.registerSingleton<ITrackedTopicsRepository>('TrackedTopicsRepository', TrackedTopicsRepository);

container.registerSingleton<ITrackedTopicUsersRepository>('TrackedTopicUsersRepository', TrackedTopicUsersRepository);

container.registerSingleton<ITrackedPhrasesRepository>('TrackedPhrasesRepository', TrackedPhrasesRepository);

container.registerSingleton<IIgnoredTopicsRepository>('IgnoredTopicsRepository', IgnoredTopicsRepository);

container.registerSingleton<IMeritsRepository>('MeritsRepository', MeritsRepository);

container.registerSingleton<IModLogRepository>('ModLogRepository', ModLogRepository);

container.registerSingleton<IAddressesRepository>('AddressesRepository', AddressesRepository);

container.registerSingleton<IPostsAddressesRepository>('PostsAddressesRepository', PostsAddressesRepository);

container.registerSingleton<IPostsHistoryRepository>('PostsHistoryRepository', PostsHistoryRepository);

container.registerSingleton<ICacheRepository>('CacheRepository', RedisProvider);