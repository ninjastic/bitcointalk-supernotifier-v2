import { inject, injectable } from 'tsyringe';
import { isBefore } from 'date-fns';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import forumScrapperLowPrioritySideQueue from '../../../shared/infra/bull/queues/forumScrapperLowPrioritySideQueue';

type Job = { time: number; topic_id: number; post_id: number };

@injectable()
export default class CheckPostsRescraperForChangesService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute(): Promise<void> {
    const jobs = await this.cacheRepository.recoverByPrefix<Job>('RescrapeForChanges:*');

    const jobsToRun = jobs.filter((job: { time: number }) => {
      const date = new Date().getTime();

      return isBefore(job.time, date);
    });

    for await (const job of jobsToRun) {
      await forumScrapperLowPrioritySideQueue.add('scrapePostForChanges', {
        topic_id: job.topic_id,
        post_id: job.post_id
      });

      await this.cacheRepository.invalidate(`RescrapeForChanges:${job.time}:${job.post_id}`);
    }

    // await forumScrapperLowPrioritySideQueue.close();
  }
}
