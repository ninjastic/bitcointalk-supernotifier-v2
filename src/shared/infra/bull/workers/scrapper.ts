import 'reflect-metadata';
import 'dotenv/config.js';
import Queue, { Job } from 'bull';
import { container } from 'tsyringe';

import '../../typeorm';
import '../../../container';

import cacheConfig from '../../../../config/cache';
import loggerHandler from '../handlers/loggerHandler';
import uptimeConfig from '../../../../../.uptime.config.json';

import { uptimeApi } from '../../../services/api';

import ScrapePostDTO from '../../../../modules/posts/dtos/ScrapePostDTO';

import ScrapeMeritsRepository from '../../../../modules/merits/infra/typeorm/repositories/ScrapeMeritsRepository';
import ScrapePostsRepository from '../../../../modules/posts/infra/typeorm/repositories/ScrapePostsRepository';

import SavePostService from '../../../../modules/posts/services/SavePostService';
import ScrapeUserMeritCountService from '../../../../modules/merits/services/ScrapeUserMeritCountService';
import ScrapeTopicService from '../../../../modules/posts/services/ScrapeTopicService';
import ScrapeModLogService from '../../../../modules/modlog/services/ScrapeModLogService';
import ScrapePostForEditsService from '../../../../modules/posts/services/ScrapePostForChangesService';

interface ScrapePostJob extends Job {
  data: ScrapePostDTO;
}

interface ScrapeUserMeritCountData {
  uid: number;
}

interface ScrapeTopicJobData {
  topic_id: number;
}

interface ScrapeUserMeritCountJob extends Job {
  data: ScrapeUserMeritCountData;
}

interface ScrapeTopicJob extends Job {
  data: ScrapeTopicJobData;
}

(async () => {
  const mainQueue = new Queue('ForumScrapperQueue', {
    redis: cacheConfig.config.redis,
    defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
  });

  const sideQueue = new Queue('ForumScrapperSideQueue', {
    redis: cacheConfig.config.redis,
    defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
  });

  const lowPrioritySideQueue = new Queue('ForumScrapperLowPrioritySideQueue', {
    redis: cacheConfig.config.redis,
    limiter: {
      max: 1,
      duration: 1000
    },
    defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
  });

  await mainQueue.removeRepeatable('scrapeRecentPosts', { every: 5000 });
  await mainQueue.removeRepeatable('scrapeMerits', { every: 15000 });
  await mainQueue.removeRepeatable('scrapeModLog', { every: 300000 });

  await mainQueue.add('scrapeRecentPosts', null, {
    repeat: { every: 5000 },
  });

  await mainQueue.add('scrapeMerits', null, {
    repeat: { every: 15000 },
  });

  await mainQueue.add('scrapeModLog', null, {
    repeat: { every: 300000 },
  });

  mainQueue.process('scrapeRecentPosts', async () => {
    const scrapePostsRepository = container.resolve(ScrapePostsRepository);

    await scrapePostsRepository.scrapeRecent();
    uptimeApi.get(`/heartbeat/${uptimeConfig.scrapers.posts}`);
  });

  mainQueue.process('scrapeMerits', async () => {
    const scrapeMeritsRepository = container.resolve(ScrapeMeritsRepository);
    
    await scrapeMeritsRepository.scrapeMerits();
    uptimeApi.get(`/heartbeat/${uptimeConfig.scrapers.merits}`);
  });

  mainQueue.process('scrapeModLog', async () => {
    const scrapeModLog = new ScrapeModLogService();

    await scrapeModLog.execute();
  });

  sideQueue.process('scrapePost', async (job: ScrapePostJob) => {
    const scrapePostsRepository = container.resolve(ScrapePostsRepository);
    const savePostService = container.resolve(SavePostService);

    const post = await scrapePostsRepository.scrapePost({
      topic_id: job.data.topic_id,
      post_id: job.data.post_id,
    });

    await savePostService.execute(post);
  });

  sideQueue.process(
    'scrapeUserMeritCount',
    async (job: ScrapeUserMeritCountJob) => {
      const scrapeUserMeritCount = new ScrapeUserMeritCountService();

      await scrapeUserMeritCount.execute(job.data.uid);
    },
  );

  sideQueue.process('scrapeTopic', async (job: ScrapeTopicJob) => {
    const scrapeTopic = container.resolve(ScrapeTopicService);

    await scrapeTopic.execute(job.data.topic_id);
  });

  lowPrioritySideQueue.process('scrapePostForChanges', async (job: ScrapePostJob) => {
    const { topic_id, post_id } = job.data;

    const scrapePostForEdits = container.resolve(ScrapePostForEditsService);

    await scrapePostForEdits.execute({ topic_id, post_id });
  });

  loggerHandler(mainQueue);
  loggerHandler(sideQueue);
  loggerHandler(lowPrioritySideQueue);
})();
