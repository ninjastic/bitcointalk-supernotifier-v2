import forumScrapperQueue from '../../../../shared/infra/bull/queues/ForumScrapperQueue';

class ScrapeMeritsJob {
  public start(): void {
    const { queue } = forumScrapperQueue;

    queue.add('scrapeMerits', null, {
      repeat: { every: 15000 },
      removeOnComplete: true,
      removeOnFail: true,
    });
  }
}

export default new ScrapeMeritsJob();
