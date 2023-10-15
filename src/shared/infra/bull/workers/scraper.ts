import 'reflect-metadata';
import 'dotenv/config.js';
import { Job, Worker } from 'bullmq';
import { container } from 'tsyringe';
import { createConnection } from 'typeorm';

import '../../../container';
import logger from '../../../services/logger';

import cacheConfig from '../../../../config/cache';
import { uptimeApi } from '../../../services/api';
import { queueRepeatableFunction } from '../../../services/utils';

import ScrapePostsRepository from '../../../../modules/posts/infra/typeorm/repositories/ScrapePostsRepository';
import ScrapeRecentMeritsService from '../../../../modules/merits/services/ScrapeRecentMeritsService';

import forumScraperQueue from '../queues/forumScraperQueue';

import SavePostService from '../../../../modules/posts/services/SavePostService';
import ScrapeUserMeritCountService from '../../../../modules/merits/services/ScrapeUserMeritCountService';
import ScrapeTopicService from '../../../../modules/posts/services/ScrapeTopicService';
import ScrapeModLogService from '../../../../modules/modlog/services/ScrapeModLogService';
import ScrapePostForEditsService from '../../../../modules/posts/services/ScrapePostForChangesService';

type JobRecipes = Record<string, (job: Job) => Promise<any>>;

const scrapeRecentPosts = async (): Promise<number> => {
  const scrapePostsRepository = container.resolve(ScrapePostsRepository);
  const result = await scrapePostsRepository.scrapeRecent();
  uptimeApi.get(process.env.HEARTBEAT_POSTS);
  return result;
};

const scrapeMerits = async (): Promise<number> => {
  const scrapeRecentMeritsService = new ScrapeRecentMeritsService();
  const result = await scrapeRecentMeritsService.execute();
  uptimeApi.get(process.env.HEARTBEAT_MERITS);
  return result.length;
};

const scrapeModLog = async (): Promise<number> => {
  const scrapeModLogService = new ScrapeModLogService();
  const result = await scrapeModLogService.execute();
  return result;
};

const jobRecipes: JobRecipes = {
  scrapePost: async (job: Job) => {
    const scrapePostsRepository = container.resolve(ScrapePostsRepository);
    const savePostService = container.resolve(SavePostService);
    const post = await scrapePostsRepository.scrapePost({
      topic_id: job.data.topic_id,
      post_id: job.data.post_id
    });

    const result = await savePostService.execute(post);
    return result;
  },
  scrapeUserMeritCount: async (job: Job) => {
    const scrapeUserMeritCount = new ScrapeUserMeritCountService();
    const result = await scrapeUserMeritCount.execute(job.data.uid);
    return result;
  },
  scrapeTopic: async (job: Job) => {
    const scrapeTopic = container.resolve(ScrapeTopicService);
    const result = await scrapeTopic.execute(job.data.topic_id);
    return result;
  },
  scrapePostForChanges: async (job: Job) => {
    const { topic_id, post_id } = job.data;
    const scrapePostForEdits = container.resolve(ScrapePostForEditsService);
    const result = await scrapePostForEdits.execute({ topic_id, post_id });
    return result;
  }
};

const scraper = async () => {
  await createConnection();

  const worker = new Worker(
    forumScraperQueue.name,
    async (job: Job) => {
      const jobRecipe = jobRecipes[job.name];

      if (!jobRecipe) {
        throw Error(`No job recipe for ${job.name}`);
      }

      return jobRecipe(job);
    },
    { connection: cacheConfig.config.redis }
  );

  worker.on('active', async (job: Job) => {
    logger.info({ jobId: job.id, data: job.data }, `[${worker.name}][Worker] Active ${job.name}`);
  });

  worker.on('completed', async (job: Job) => {
    logger.info(
      { jobId: job.id, value: job.returnvalue, data: job.data },
      `[${worker.name}][Worker] Completed ${job.name}`
    );
  });

  worker.on('failed', async ({ failedReason, id }, error) => {
    logger.warn({ jobId: id, error }, `[${worker.name}][Worker] Failed for ${failedReason}`);
  });

  worker.on('error', async error => {
    logger.error({ error }, `[${worker.name}][Worker] Error`);
  });

  queueRepeatableFunction(scrapeRecentPosts, 1000 * 5);
  queueRepeatableFunction(scrapeMerits, 1000 * 15);
  queueRepeatableFunction(scrapeModLog, 100 * 60 * 5);
};

scraper();
