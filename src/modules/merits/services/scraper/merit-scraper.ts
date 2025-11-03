import Merit from '##/modules/merits/infra/typeorm/entities/Merit';
import ForumLoginService from '##/modules/merits/services/ForumLoginService';
import Post from '##/modules/posts/infra/typeorm/entities/Post';
import PostVersion from '##/modules/posts/infra/typeorm/entities/PostVersion';
import Topic from '##/modules/posts/infra/typeorm/entities/Topic';
import type RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import forumScraperQueue, { addForumScraperJob } from '##/shared/infra/bull/queues/forumScraperQueue';
import api from '##/shared/services/api';
import logger from '##/shared/services/logger';
import type Cheerio from 'cheerio';
import { load } from 'cheerio';
import { sub } from 'date-fns';
import { container } from 'tsyringe';
import type { Repository } from 'typeorm';
import { getRepository, IsNull, Not } from 'typeorm';

export class MeritScraper {
  RECENT_MERITS_URL = 'index.php?action=merit;stats=recent';

  redisProvider: RedisProvider;
  postsRepository: Repository<Post>;
  topicsRepository: Repository<Topic>;
  postsVersionsRepository: Repository<PostVersion>;
  meritsRepository: Repository<Merit>;

  currentDate: Date;

  constructor() {
    this.redisProvider = container.resolve<RedisProvider>('CacheRepository');
    this.postsRepository = getRepository(Post);
    this.topicsRepository = getRepository(Topic);
    this.postsVersionsRepository = getRepository(PostVersion);
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
      const forumLoginService = new ForumLoginService();
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

    const meritPostTitle = $('a:last-child').text().trim();

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
      const result = await addForumScraperJob('scrapePost', { post_id }, true);
      post = await this.postsRepository.save(result.post);
      if (result.topic) {
        await this.topicsRepository.save(result.topic);
      }
    } else {
      if (post.title !== meritPostTitle) {
        const latestPostVersionWithNewTitle = await this.postsVersionsRepository.findOne({
          where: { post_id, new_title: Not(IsNull()) },
          order: { created_at: 'DESC' }
        });

        const scrapePostForChangesJobId = `scrapePostForChanges-${post_id}`;
        const alreadyHasJob = await forumScraperQueue.getJob(scrapePostForChangesJobId);

        if (!alreadyHasJob && !latestPostVersionWithNewTitle) {
          logger.debug(
            { post, meritPostTitle },
            'Merit post title mismatch with archived post title, scheduling version rescrape for post'
          );
          await addForumScraperJob('scrapePostForChanges', { post_id }, false, {
            jobId: scrapePostForChangesJobId
          });
        }
      }
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
        await this.redisProvider.save(meritKey, true, 'EX', 3600); // 1 hour
        logger.debug(`[MeritScraper] Saved merit ${meritKey}`);
        return newMerit;
      }

      logger.debug(`[MeritScraper] Merit ${meritKey} already exists.`);
      await this.redisProvider.save(meritKey, true, 'EX', 3600); // 1 hour
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
    return `merit:${merit.post_id}:${merit.sender_uid}:${new Date(merit.date).getTime()}:${merit.amount}`;
  }
}
