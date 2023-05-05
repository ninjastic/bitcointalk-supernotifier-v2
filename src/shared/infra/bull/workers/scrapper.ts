import 'reflect-metadata';
import 'dotenv/config.js';
import { Job } from 'bull';
import { container } from 'tsyringe';

import '../../typeorm';
import '../../../container';

import { uptimeApi } from '../../../services/api';

import ScrapePostDTO from '../../../../modules/posts/dtos/ScrapePostDTO';

import ScrapeMeritsRepository from '../../../../modules/merits/infra/typeorm/repositories/ScrapeMeritsRepository';
import ScrapePostsRepository from '../../../../modules/posts/infra/typeorm/repositories/ScrapePostsRepository';

import forumRecentPostsQueue from '../queues/forumRecentPostsQueue';
import forumScrapperQueue from '../queues/forumScrapperQueue';
import forumScrapperSideQueue from '../queues/forumScrapperSideQueue';
import forumScrapperLowPrioritySideQueue from '../queues/forumScrapperLowPrioritySideQueue';

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
  await forumRecentPostsQueue.removeRepeatable('scrapeRecentPosts', { every: 5000 });
  await forumScrapperQueue.removeRepeatable('scrapeRecentPosts', { every: 5000 });
  await forumScrapperQueue.removeRepeatable('scrapeMerits', { every: 15000 });
  await forumScrapperQueue.removeRepeatable('scrapeModLog', { every: 300000 });

  await forumRecentPostsQueue.add('scrapeRecentPosts', null, {
    repeat: { every: 5000 }
  });

  await forumScrapperQueue.add('scrapeMerits', null, {
    repeat: { every: 15000 }
  });

  await forumScrapperQueue.add('scrapeModLog', null, {
    repeat: { every: 300000 }
  });

  forumRecentPostsQueue.process('scrapeRecentPosts', async () => {
    const scrapePostsRepository = container.resolve(ScrapePostsRepository);
    const result = await scrapePostsRepository.scrapeRecent();
    uptimeApi.get(process.env.HEARTBEAT_POSTS);
    return result;
  });

  forumScrapperQueue.process('scrapeMerits', async () => {
    const scrapeMeritsRepository = container.resolve(ScrapeMeritsRepository);
    const result = await scrapeMeritsRepository.scrapeMerits();
    uptimeApi.get(process.env.HEARTBEAT_MERITS);
    return result;
  });

  forumScrapperQueue.process('scrapeModLog', async () => {
    const scrapeModLog = new ScrapeModLogService();
    const result = await scrapeModLog.execute();
    return result;
  });

  forumScrapperSideQueue.process('scrapePost', async (job: ScrapePostJob) => {
    const scrapePostsRepository = container.resolve(ScrapePostsRepository);
    const savePostService = container.resolve(SavePostService);
    const post = await scrapePostsRepository.scrapePost({
      topic_id: job.data.topic_id,
      post_id: job.data.post_id
    });

    const result = await savePostService.execute(post);
    return result;
  });

  forumScrapperSideQueue.process('scrapeUserMeritCount', async (job: ScrapeUserMeritCountJob) => {
    const scrapeUserMeritCount = new ScrapeUserMeritCountService();
    const result = await scrapeUserMeritCount.execute(job.data.uid);
    return result;
  });

  forumScrapperSideQueue.process('scrapeTopic', async (job: ScrapeTopicJob) => {
    const scrapeTopic = container.resolve(ScrapeTopicService);
    const result = await scrapeTopic.execute(job.data.topic_id);
    return result;
  });

  forumScrapperLowPrioritySideQueue.process('scrapePostForChanges', async (job: ScrapePostJob) => {
    const { topic_id, post_id } = job.data;
    const scrapePostForEdits = container.resolve(ScrapePostForEditsService);
    const result = await scrapePostForEdits.execute({ topic_id, post_id });
    return result;
  });
})();
