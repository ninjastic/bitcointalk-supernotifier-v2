import { isBefore } from 'date-fns';

import { addForumScraperJob } from '../../../shared/infra/bull/queues/forumScraperQueue';
import { PostScraper } from '##/modules/posts/services/scraper/post-scraper';

export type RescrapeSchedule = { time: number; post_id: number };

const checkPostRescrapeSchedules = async () => {
  const postScraper = new PostScraper();
  const rescrapeSchedules = await postScraper.getScheduledPostRescrapes();

  const rescrapeSchedulesToRun = rescrapeSchedules.filter((job: { time: number }) => {
    const date = new Date().getTime();
    return isBefore(job.time, date);
  });

  for await (const rescrapeSchedule of rescrapeSchedulesToRun) {
    const newJob = await addForumScraperJob('scrapePostForChanges', {
      post_id: rescrapeSchedule.post_id
    });

    if (newJob) {
      postScraper.deleteScheduledPostRescrape(rescrapeSchedule);
    }
  }
};

export default checkPostRescrapeSchedules;