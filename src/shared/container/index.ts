import { MeritScraper } from '##/modules/merits/services/scraper/merit-scraper';
import { NotificationService } from '##/modules/posts/services/notification-service';
import { PostScraper } from '##/modules/posts/services/scraper/post-scraper';
import { container } from 'tsyringe';

import type IMeritsRepository from '../../modules/merits/repositories/IMeritsRepository';
import type IModLogRepository from '../../modules/modlog/repositories/IModLogRepository';
import type IAddressesRepository from '../../modules/posts/repositories/IAddressesRepository';
import type IIgnoredTopicsRepository from '../../modules/posts/repositories/IIgnoredTopicsRepository';
import type IPostsAddressesRepository from '../../modules/posts/repositories/IPostsAddressesRepository';
import type IPostsHistoryRepository from '../../modules/posts/repositories/IPostsHistoryRepository';
import type IPostsRepository from '../../modules/posts/repositories/IPostsRepository';
import type ITrackedPhrasesRepository from '../../modules/posts/repositories/ITrackedPhrasesRepository';
import type ITrackedTopicsRepository from '../../modules/posts/repositories/ITrackedTopicsRepository';
import type ITrackedTopicUsersRepository from '../../modules/posts/repositories/ITrackedTopicUsersRepository';
import type IIgnoredUserRepository from '../../modules/users/repositories/IIgnoredUserRepository';
import type IUsersRepository from '../../modules/users/repositories/IUsersRepository';
import type ICacheRepository from './providers/models/ICacheProvider';

import MeritsRepository from '../../modules/merits/infra/typeorm/repositories/MeritsRepository';
import ModLogRepository from '../../modules/modlog/infra/typeorm/repositories/ModLogRepository';
import AddressesRepository from '../../modules/posts/infra/typeorm/repositories/AddressesRepository';
import IgnoredTopicsRepository from '../../modules/posts/infra/typeorm/repositories/IgnoredTopicsRepository';
import PostsAddressesRepository from '../../modules/posts/infra/typeorm/repositories/PostsAddressesRepository';
import PostsHistoryRepository from '../../modules/posts/infra/typeorm/repositories/PostsHistoryRepository';
import PostsRepository from '../../modules/posts/infra/typeorm/repositories/PostsRepository';
import TrackedPhrasesRepository from '../../modules/posts/infra/typeorm/repositories/TrackedPhrasesRepository';
import TrackedTopicsRepository from '../../modules/posts/infra/typeorm/repositories/TrackedTopicsRepository';
import TrackedTopicUsersRepository from '../../modules/posts/infra/typeorm/repositories/TrackedTopicUsersRepository';
import IgnoredUserRepository from '../../modules/users/infra/typeorm/repositories/IgnoredUserRepository';
import UsersRepository from '../../modules/users/infra/typeorm/repositories/UsersRepository';
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

container.registerSingleton<NotificationService>('NotificationService', NotificationService);

container.registerSingleton<PostScraper>('PostScraper', PostScraper);

container.registerSingleton<MeritScraper>('MeritScraper', MeritScraper);
