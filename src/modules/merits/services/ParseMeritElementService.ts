import cheerio from 'cheerio';
import { inject, injectable } from 'tsyringe';

import ScrapePostJob from '../../posts/infra/jobs/ScrapePostJob';

import Merit from '../infra/typeorm/entities/Merit';

import IMeritsRepository from '../repositories/IMeritsRepository';
import IPostsRepository from '../../posts/repositories/IPostsRepository';

@injectable()
export default class ParseRecentPostElementService {
  constructor(
    @inject('MeritsRepository')
    private meritsRepository: IMeritsRepository,

    @inject('PostsRepository')
    private postsRepository: IPostsRepository
  ) {}

  public async execute(element: cheerio.Element): Promise<Merit> {
    const $ = cheerio.load(element, { decodeEntities: true });

    const amount = Number($.html().match(/: (\d*) from/)[1]);
    const sender = $.html().match(/">(.*)<\/a> for/)[1];
    const sender_uid = Number($.html().match(/u=(\d*)"/)[1]);

    const d = new Date();
    const today = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    const withFixedDate = $.html().replace('<b>Today</b> at', today);
    const date = new Date(withFixedDate.match(/>(.*): \d* from <a/i)[1]);

    const post_id = Number($.html().match(/#msg(\d*)/)[1]);
    const topic_id = Number($.html().match(/topic=(\d*)/)[1]);

    let post = await this.postsRepository.findOneByPostId(post_id);

    let receiver: string;
    let receiver_uid: number;

    if (!post) {
      const scrapePostJob = new ScrapePostJob();
      post = await scrapePostJob.start({ topic_id, post_id });
    }

    if (post) {
      receiver = post.author;
      receiver_uid = post.author_uid;
    }

    const merit = this.meritsRepository.create({
      amount,
      sender,
      sender_uid,
      receiver,
      receiver_uid,
      date,
      post_id,
      topic_id,
      notified: false,
      notified_to: [],
      checked: false
    });

    return merit;
  }
}
