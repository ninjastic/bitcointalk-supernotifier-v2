import cheerio from 'cheerio';
import { container } from 'tsyringe';
import { sub } from 'date-fns';

import { getManager } from 'typeorm';
import api from '../../../shared/services/api';
import Merit from '../infra/typeorm/entities/Merit';
import PostsRepository from '../../posts/infra/typeorm/repositories/PostsRepository';
import MeritsRepository from '../infra/typeorm/repositories/MeritsRepository';
import ForumLoginService from './ForumLoginService';
import ScrapePostJob from '../../posts/infra/jobs/ScrapePostJob';

const getRequestPageSelector = async () => {
  const response = await api.get('index.php?action=merit;stats=recent');
  const $ = cheerio.load(response.data, { decodeEntities: true });
  return $;
};

export default class ScrapeRecentMeritsService {
  public async execute(): Promise<Merit[]> {
    const postsRepository = container.resolve(PostsRepository);
    const meritsRepository = container.resolve(MeritsRepository);

    let $ = await getRequestPageSelector();

    const isLogged = !!$('#hellomember').length;

    if (!isLogged) {
      const forumLoginService = new ForumLoginService();
      await forumLoginService.execute();

      $ = await getRequestPageSelector();
    }

    const currentDate = sub(
      new Date($('body > div.tborder > table:nth-child(2) > tbody > tr:nth-child(1) > td:nth-child(2) > span').text()),
      { minutes: new Date().getTimezoneOffset() }
    );

    const meritElements = $('ul > li');
    const merits: Merit[] = [];

    for await (const meritElement of meritElements) {
      const elementSelector = $(meritElement);

      const amount = Number(elementSelector.html().match(/: (\d*) from/)[1]);
      const sender = elementSelector.html().match(/">(.*)<\/a> for/)[1];
      const sender_uid = Number(elementSelector.html().match(/u=(\d*)"/)[1]);

      const today = `${currentDate.getFullYear()}/${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
      const withFixedDate = elementSelector.html().replace('<b>Today</b> at', today);
      const date = new Date(withFixedDate.match(/(.*): \d* from <a/i)[1]);

      const post_id = Number(elementSelector.html().match(/#msg(\d*)/)[1]);
      const topic_id = Number(elementSelector.html().match(/topic=(\d*)/)[1]);

      let post = await postsRepository.findOneByPostId(post_id);

      let receiver: string;
      let receiver_uid: number;

      if (!post) {
        const scrapePostJob = new ScrapePostJob();
        post = await scrapePostJob.start({ post_id });
      }

      if (post) {
        receiver = post.author;
        receiver_uid = post.author_uid;
      }

      const merit = meritsRepository.create({
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

      merits.push(merit);
    }

    const insertedMerits = await getManager()
      .createQueryBuilder()
      .insert()
      .into(Merit)
      .values(merits)
      .returning('*')
      .onConflict('("date", "amount", "post_id", "sender_uid") DO NOTHING')
      .execute();

    return insertedMerits.raw as Merit[];
  }
}
