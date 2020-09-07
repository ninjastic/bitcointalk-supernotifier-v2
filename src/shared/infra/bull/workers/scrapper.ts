import 'reflect-metadata';
import 'dotenv/config.js';
import Queue, { Job } from 'bull';
import { container } from 'tsyringe';

import '../../typeorm';
import '../../../container';

import cacheConfig from '../../../../config/cache';
import loggerHandler from '../handlers/loggerHandler';

import ScrapePostDTO from '../../../../modules/posts/dtos/ScrapePostDTO';

import ScrapeMeritsRepository from '../../../../modules/merits/infra/typeorm/repositories/ScrapeMeritsRepository';
import ScrapePostsRepository from '../../../../modules/posts/infra/typeorm/repositories/ScrapePostsRepository';

import SavePostService from '../../../../modules/posts/services/SavePostService';
import ScrapeUserMeritCountService from '../../../../modules/merits/services/ScrapeUserMeritCountService';
import ScrapeTopicService from '../../../../modules/posts/services/ScrapeTopicService';
import ScrapeModLogService from '../../../../modules/modlog/services/ScrapeModLogService';
import ScrapePostForEditsService from '../../../../modules/posts/services/ScrapePostForEditsService';

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
  });

  const sideQueue = new Queue('ForumScrapperSideQueue', {
    redis: cacheConfig.config.redis,
  });

  await mainQueue.removeRepeatable('scrapeRecentPosts', { every: 5000 });
  await mainQueue.removeRepeatable('scrapeMerits', { every: 15000 });
  await mainQueue.removeRepeatable('scrapeModLog', { every: 300000 });

  await mainQueue.add('scrapeRecentPosts', null, {
    repeat: { every: 5000 },
    removeOnComplete: true,
    removeOnFail: true,
  });

  await mainQueue.add('scrapeMerits', null, {
    repeat: { every: 15000 },
    removeOnComplete: true,
    removeOnFail: true,
  });

  await mainQueue.add('scrapeModLog', null, {
    repeat: { every: 300000 },
    removeOnComplete: true,
    removeOnFail: true,
  });

  mainQueue.process('scrapeRecentPosts', async () => {
    const scrapePostsRepository = container.resolve(ScrapePostsRepository);

    return scrapePostsRepository.scrapeRecent();
  });

  mainQueue.process('scrapeMerits', async () => {
    const scrapeMeritsRepository = container.resolve(ScrapeMeritsRepository);
    return scrapeMeritsRepository.scrapeMerits();
  });

  mainQueue.process('scrapeModLog', async () => {
    const scrapeModLog = new ScrapeModLogService();

    return scrapeModLog.execute();
  });

  sideQueue.process('scrapePost', async (job: ScrapePostJob) => {
    const scrapePostsRepository = container.resolve(ScrapePostsRepository);
    const savePostService = container.resolve(SavePostService);

    const post = await scrapePostsRepository.scrapePost({
      topic_id: job.data.topic_id,
      post_id: job.data.post_id,
    });

    await savePostService.execute(post);

    return post;
  });

  sideQueue.process(
    'scrapeUserMeritCount',
    async (job: ScrapeUserMeritCountJob) => {
      const scrapeUserMeritCount = new ScrapeUserMeritCountService();

      return scrapeUserMeritCount.execute(job.data.uid);
    },
  );

  sideQueue.process('scrapeTopic', async (job: ScrapeTopicJob) => {
    const scrapeTopic = container.resolve(ScrapeTopicService);

    return scrapeTopic.execute(job.data.topic_id);
  });

  sideQueue.process('scrapePostForEdit', async (job: ScrapePostJob) => {
    const { topic_id, post_id } = job.data;

    const scrapePostForEdits = container.resolve(ScrapePostForEditsService);

    return scrapePostForEdits.execute({ topic_id, post_id });
  });

  loggerHandler(mainQueue);
  loggerHandler(sideQueue);
})();
