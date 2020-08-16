import forumScrapperQueue from '../../../../shared/infra/bull/queues/ForumScrapperQueue';

class ScrapeRecentPostsJob {
  public start(): void {
    const { queue } = forumScrapperQueue;

    queue.add('scrapeRecentPosts', null, {
      repeat: { every: 5000 },
      removeOnComplete: true,
      removeOnFail: true,
    });
  }
}

export default new ScrapeRecentPostsJob();
