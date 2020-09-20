import { inject, injectable } from 'tsyringe';
import { isBefore } from 'date-fns'
import Queue from 'bull'

import cacheConfig from '../../../config/cache'

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';


@injectable()
export default class CheckPostsRescraperForChangesService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(): Promise<void> {
    const jobs = await this.cacheRepository.recoverByPrefix('RescrapeForChanges:*')
    
    const lowPrioritySideQueue = new Queue('ForumScrapperLowPrioritySideQueue', {
      redis: cacheConfig.config.redis,
      defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
    });


    const jobsToRun = jobs.filter((job: { time: number })  => {
        const date = new Date().getTime();

        return isBefore(job.time, date)
    });

    await Promise.all(jobsToRun.map(async (job: { time: number, topic_id: Number, post_id: number }) => {
        await lowPrioritySideQueue.add(
          'scrapePostForChanges',
          { topic_id: job.topic_id, post_id: job.post_id }
        );

        await this.cacheRepository.invalidate(`RescrapeForChanges:${job.time}:${job.post_id}`)
    }))


    await lowPrioritySideQueue.close();
  }
}
