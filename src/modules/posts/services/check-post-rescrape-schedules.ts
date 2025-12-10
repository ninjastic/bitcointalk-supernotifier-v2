import type { PostScraper } from '##/modules/posts/services/scraper/post-scraper';

import { isBefore } from 'date-fns';
import { container } from 'tsyringe';

import { addForumScraperJob } from '../../../shared/infra/bull/queues/forumScraperQueue';

export interface RescrapeSchedule { time: number; post_id: number }

async function checkPostRescrapeSchedules() {
  const postScraper = container.resolve<PostScraper>('PostScraper');
  const rescrapeSchedules = await postScraper.getScheduledPostRescrapes();

  const rescrapeSchedulesToRun = rescrapeSchedules.filter((job: { time: number }) => {
    const date = new Date().getTime();
    return isBefore(job.time, date);
  });

  for await (const rescrapeSchedule of rescrapeSchedulesToRun) {
    const newJob = await addForumScraperJob('scrapePostForChanges', {
      post_id: rescrapeSchedule.post_id,
    });

    if (newJob) {
      await postScraper.deleteScheduledPostRescrape(rescrapeSchedule);
    }
  }
}

export default checkPostRescrapeSchedules;
