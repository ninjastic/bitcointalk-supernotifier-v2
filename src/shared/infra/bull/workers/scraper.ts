import 'reflect-metadata';
import 'module-alias/register';
import 'dotenv/config';
import { Job, Worker } from 'bullmq';
import { createConnection } from 'typeorm';

import '../../../container';
import logger from '../../../services/logger';

import cacheConfig from '../../../../config/cache';
import { uptimeApi } from '../../../services/api';
import { queueRepeatableFunction } from '../../../services/utils';

import forumScraperQueue, {
  ForumScraperQueueInput,
  ForumScraperQueueJobName,
  ForumScraperQueueOutput,
  JobRecipes
} from '../queues/forumScraperQueue';

import ScrapeUserMeritCountService from '../../../../modules/merits/services/ScrapeUserMeritCountService';
import ScrapeModLogService from '../../../../modules/modlog/services/ScrapeModLogService';
import ForumLoginService from '../../../../modules/merits/services/ForumLoginService';
import { PostScraper } from '##/modules/posts/services/scraper/post-scraper';
import { MeritScraper } from '##/modules/merits/services/scraper/merit-scraper';
import { container } from 'tsyringe';

const scraper = async () => {
  await createConnection();
  const postScraper = container.resolve<PostScraper>('PostScraper');
  const meritScraper = container.resolve<MeritScraper>('MeritScraper');

  const scrapeRecentPosts = async (): Promise<number> => {
    const results = await postScraper.scrapeRecentPosts();
    uptimeApi.get(process.env.HEARTBEAT_POSTS);
    return results.length;
  };

  const scrapeMerits = async (): Promise<number> => {
    const results = await meritScraper.scrapeRecentMerits();
    uptimeApi.get(process.env.HEARTBEAT_MERITS);
    return results.length;
  };

  const scrapeModLog = async (): Promise<number> => {
    const scrapeModLogService = new ScrapeModLogService();
    const result = await scrapeModLogService.execute();
    return result;
  };

  const jobRecipes: JobRecipes = {
    scrapePost: async job => {
      const post = await postScraper.scrapePost(job.data.post_id);
      return post;
    },
    scrapeUserMeritCount: async job => {
      const scrapeUserMeritCount = new ScrapeUserMeritCountService();
      const result = await scrapeUserMeritCount.execute(job.data.uid);
      return result;
    },
    scrapeTopic: async job => {
      const topicPost = await postScraper.scrapeTopicOp(job.data.topic_id);
      return topicPost;
    },
    scrapePostForChanges: async job => {
      const result = await postScraper.scrapePostVersion(job.data.post_id);
      return result;
    }
  };

  const worker = new Worker<ForumScraperQueueInput, ForumScraperQueueOutput, ForumScraperQueueJobName>(
    forumScraperQueue.name,
    async (job: Job) => {
      const jobRecipe = jobRecipes[job.name];

      if (!jobRecipe) {
        throw Error(`No job recipe for ${job.name}`);
      }

      return jobRecipe(job);
    },
    { connection: { ...cacheConfig.config.redis, connectionName: 'ScraperQueue' } }
  );

  worker.on('active', async (job: Job) => {
    logger.debug({ jobName: job.name, jobId: job.id, data: job.data }, `[${worker.name}][Worker] Active ${job.name}`);
  });

  worker.on('completed', async (job: Job) => {
    logger.debug(
      { jobName: job.name, jobId: job.id, value: job.returnvalue, data: job.data },
      `[${worker.name}][Worker] Completed ${job.name}`
    );
  });

  worker.on('failed', async ({ name, failedReason, id }, error) => {
    logger.warn({ jobName: name, jobId: id, error }, `[${worker.name}][Worker] Failed for ${failedReason}`);
  });

  worker.on('error', async error => {
    logger.error(error, `[${worker.name}][Worker] Error`);
  });

  const forumLoginService = new ForumLoginService();
  await forumLoginService.execute();

  queueRepeatableFunction(scrapeRecentPosts, 1000 * 5);
  queueRepeatableFunction(scrapeMerits, 1000 * 15);
  queueRepeatableFunction(scrapeModLog, 100 * 60 * 5);
};

scraper();
