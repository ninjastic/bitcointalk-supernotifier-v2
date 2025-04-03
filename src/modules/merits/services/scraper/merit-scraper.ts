import Merit from '##/modules/merits/infra/typeorm/entities/Merit';
import ForumLoginService from '##/modules/merits/services/ForumLoginService';
import scrapePostJob from '##/modules/posts/infra/jobs/scrape-post-job';
import Post from '##/modules/posts/infra/typeorm/entities/Post';
import RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import api from '##/shared/services/api';
import logger from '##/shared/services/logger';
import Cheerio, { load } from 'cheerio';
import { sub } from 'date-fns';
import { container } from 'tsyringe';
import { getRepository, Repository } from 'typeorm';

export class MeritScraper {
  RECENT_MERITS_URL = 'index.php?action=merit;stats=recent';

  redisProvider: RedisProvider;
  postsRepository: Repository<Post>;
  meritsRepository: Repository<Merit>;

  currentDate: Date;

  constructor() {
    this.redisProvider = container.resolve(RedisProvider);
    this.postsRepository = getRepository(Post);
    this.meritsRepository = getRepository(Merit);
  }

  private async getPageContent(): Promise<typeof Cheerio> {
    const response = await api.get(this.RECENT_MERITS_URL);
    return load(response.data, { decodeEntities: true }) as typeof Cheerio;
  }

  private async ensureLoggedIn(): Promise<typeof Cheerio> {
    let $ = await this.getPageContent();
    const isLoggedIn = !!$('#hellomember').length;

    if (!isLoggedIn) {
      const forumLoginService = container.resolve(ForumLoginService);
      await forumLoginService.execute();
      $ = await this.getPageContent();
    }

    return $;
  }

  private extractCurrentDate($: typeof Cheerio): Date {
    const dateString = $(
      'body > div.tborder > table:nth-child(2) > tbody > tr:nth-child(1) > td:nth-child(2) > span'
    ).text();
    return sub(new Date(dateString), { minutes: new Date().getTimezoneOffset() });
  }

  async parseRecentMeritElement(recentMeritElement: cheerio.Element): Promise<Merit> {
    const $ = load(recentMeritElement, { decodeEntities: true });

    const amount = Number($.html().match(/: (\d*) from/)[1]);
    const sender = $.html().match(/">(.*)<\/a> for/)[1];
    const sender_uid = Number($.html().match(/u=(\d*)"/)[1]);

    const d = this.currentDate;
    const today = `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
    const withFixedDate = $.html().replace('<b>Today</b> at', today);
    const date = new Date(withFixedDate.match(/>(.*): \d* from <a/i)[1]);

    const post_id = Number($.html().match(/#msg(\d*)/)[1]);
    const topic_id = Number($.html().match(/topic=(\d*)/)[1]);

    let post = await this.postsRepository.findOne({ where: { post_id } });

    let receiver: string;
    let receiver_uid: number;

    if (!post) {
      const result = await scrapePostJob(post_id);
      post = await this.postsRepository.save(result.post);
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

  async processMerit(merit: Merit): Promise<Merit | undefined> {
    const meritKey = this.getMeritKey(merit);

    try {
      const existingMeritOnRedis = await this.redisProvider.recover<string>(meritKey);
      if (existingMeritOnRedis) return;

      const existingMeritOnDb = await this.meritsRepository.findOne({
        where: {
          amount: merit.amount,
          sender_uid: merit.sender_uid,
          post_id: merit.post_id,
          date: merit.date
        }
      });

      if (!existingMeritOnDb) {
        const newMerit = await this.meritsRepository.save(merit);
        await this.redisProvider.save(meritKey, true, 'EX', 1800); // 30 minutes
        logger.debug(`[MeritScraper] Saved merit ${meritKey}`);
        return newMerit;
      } else {
        await this.redisProvider.save(meritKey, true, 'EX', 1800); // 30 minutes
        logger.debug(`[MeritScraper] Merit ${meritKey} already exists.`);
      }
    } catch (error) {
      logger.error({ error, meritKey }, `[MeritScraper] Error processing merit ${meritKey}`);
    }
  }

  async scrapeRecentMerits(): Promise<Merit[]> {
    try {
      const scrapedMerits = [];

      const $ = await this.ensureLoggedIn();
      this.currentDate = this.extractCurrentDate($);

      const meritElements = [...$('ul > li')].reverse();

      for await (const meritElement of meritElements) {
        const merit = await this.parseRecentMeritElement(meritElement);
        const insertedMerit = await this.processMerit(merit);
        if (insertedMerit) {
          scrapedMerits.push(insertedMerit);
        }
      }

      return scrapedMerits;
    } catch (error) {
      logger.error({ error }, '[MeritScraper] Error scraping recent merits');
      return [];
    }
  }

  getMeritKey(merit: Merit): string {
    return `merit:${new Date(merit.date)}_${merit.amount}_${merit.post_id}_${merit.sender_uid}`;
  }
}
