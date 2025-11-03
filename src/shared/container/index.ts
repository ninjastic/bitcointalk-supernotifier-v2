import { container } from 'tsyringe';

import { NotificationService } from '##/modules/posts/services/notification-service';
import type IUsersRepository from '../../modules/users/repositories/IUsersRepository';
import UsersRepository from '../../modules/users/infra/typeorm/repositories/UsersRepository';

import type IIgnoredUserRepository from '../../modules/users/repositories/IIgnoredUserRepository';
import IgnoredUserRepository from '../../modules/users/infra/typeorm/repositories/IgnoredUserRepository';

import type IPostsRepository from '../../modules/posts/repositories/IPostsRepository';
import PostsRepository from '../../modules/posts/infra/typeorm/repositories/PostsRepository';

import type ITrackedTopicsRepository from '../../modules/posts/repositories/ITrackedTopicsRepository';
import TrackedTopicsRepository from '../../modules/posts/infra/typeorm/repositories/TrackedTopicsRepository';

import type ITrackedTopicUsersRepository from '../../modules/posts/repositories/ITrackedTopicUsersRepository';
import TrackedTopicUsersRepository from '../../modules/posts/infra/typeorm/repositories/TrackedTopicUsersRepository';

import type ITrackedPhrasesRepository from '../../modules/posts/repositories/ITrackedPhrasesRepository';
import TrackedPhrasesRepository from '../../modules/posts/infra/typeorm/repositories/TrackedPhrasesRepository';

import type IIgnoredTopicsRepository from '../../modules/posts/repositories/IIgnoredTopicsRepository';
import IgnoredTopicsRepository from '../../modules/posts/infra/typeorm/repositories/IgnoredTopicsRepository';

import type IMeritsRepository from '../../modules/merits/repositories/IMeritsRepository';
import MeritsRepository from '../../modules/merits/infra/typeorm/repositories/MeritsRepository';

import type IModLogRepository from '../../modules/modlog/repositories/IModLogRepository';
import ModLogRepository from '../../modules/modlog/infra/typeorm/repositories/ModLogRepository';

import type IAddressesRepository from '../../modules/posts/repositories/IAddressesRepository';
import AddressesRepository from '../../modules/posts/infra/typeorm/repositories/AddressesRepository';

import type IPostsAddressesRepository from '../../modules/posts/repositories/IPostsAddressesRepository';
import PostsAddressesRepository from '../../modules/posts/infra/typeorm/repositories/PostsAddressesRepository';

import type IPostsHistoryRepository from '../../modules/posts/repositories/IPostsHistoryRepository';
import PostsHistoryRepository from '../../modules/posts/infra/typeorm/repositories/PostsHistoryRepository';

import type ICacheRepository from './providers/models/ICacheProvider';
import RedisProvider from './providers/implementations/RedisProvider';
import { PostScraper } from '##/modules/posts/services/scraper/post-scraper';
import { MeritScraper } from '##/modules/merits/services/scraper/merit-scraper';

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

container.registerSingleton<NotificationService>('NotificationService', NotificationService);

container.registerSingleton<PostScraper>('PostScraper', PostScraper);

container.registerSingleton<MeritScraper>('MeritScraper', MeritScraper);
