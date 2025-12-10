import type PostVersion from '##/modules/posts/infra/typeorm/entities/PostVersion';
import type { RescrapeSchedule } from '##/modules/posts/services/check-post-rescrape-schedules';
import type { ParsedPost } from '##/modules/posts/services/scraper/parse-post-html';
import type { ParsedTopicPost } from '##/modules/posts/services/scraper/parse-topic-post-op-html';
import type RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import type { AxiosRequestConfig } from 'axios';
import type Cheerio from 'cheerio';
import type { Repository } from 'typeorm';

import ForumLoginService from '##/modules/merits/services/ForumLoginService';
import Post from '##/modules/posts/infra/typeorm/entities/Post';
import Topic from '##/modules/posts/infra/typeorm/entities/Topic';
import parsePostHtml from '##/modules/posts/services/scraper/parse-post-html';
import parseTopicPostOpHtml from '##/modules/posts/services/scraper/parse-topic-post-op-html';
import { scrapePostVersion } from '##/modules/posts/services/scraper/scrape-post-version';
import { addForumScraperJob } from '##/shared/infra/bull/queues/forumScraperQueue';
import api from '##/shared/services/api';
import logger from '##/shared/services/logger';
import { load } from 'cheerio';
import { addMinutes, sub } from 'date-fns';
import { container } from 'tsyringe';
import { getRepository } from 'typeorm';

export interface RecentPostWithFooter {
  postElement: cheerio.Element;
  footerElement: cheerio.Element;
}

export class PostScraper {
  RECENT_POSTS_URL = 'index.php?action=recent';

  redisProvider: RedisProvider;
  postsRepository: Repository<Post>;
  topicsRepository: Repository<Topic>;

  constructor() {
    this.redisProvider = container.resolve<RedisProvider>('CacheRepository');
    this.postsRepository = getRepository(Post);
    this.topicsRepository = getRepository(Topic);
  }

  private async getPageContent(
    url: string,
    config: AxiosRequestConfig<any> = {},
  ): Promise<{ $: typeof Cheerio; html: string }> {
    const response = await api.get(url, config);
    return { $: load(response.data, { decodeEntities: true }) as typeof Cheerio, html: response.data };
  }

  private async ensureLoggedIn(
    url: string,
    config: AxiosRequestConfig<any> = {},
  ): Promise<{ $: typeof Cheerio; html: string }> {
    let { $, html } = await this.getPageContent(url, config);
    const isLoggedIn = !!$('#hellomember').length;

    if (!isLoggedIn) {
      const forumLoginService = new ForumLoginService();
      await forumLoginService.execute();
      ({ $, html } = await this.getPageContent(url, config));
    }

    return { $, html };
  }

  private extractCurrentDate($: typeof Cheerio): Date {
    const dateString = $(
      'body > div.tborder > table:nth-child(2) > tbody > tr:nth-child(1) > td:nth-child(2) > span',
    ).text();
    return sub(new Date(dateString), { minutes: new Date().getTimezoneOffset() });
  }

  private extractPostsWithFooters($: typeof Cheerio): RecentPostWithFooter[] {
    const tableBodies = Array.from($('div#bodyarea > table > tbody'));

    return tableBodies.reduce<RecentPostWithFooter[]>((acc, element, index) => {
      const isPostContent = index % 2 === 0;
      const recentPostIndex = Math.floor(index / 2);

      if (!acc[recentPostIndex]) {
        acc[recentPostIndex] = {} as RecentPostWithFooter;
      }

      if (isPostContent) {
        acc[recentPostIndex] = { ...acc[recentPostIndex], postElement: element };
      }
      else {
        acc[recentPostIndex] = { ...acc[recentPostIndex], footerElement: element };
      }

      return acc;
    }, []);
  }

  private parseRecentPostElement(recentPost: RecentPostWithFooter, currentDate: Date): Post {
    const { postElement, footerElement } = recentPost;
    let $ = load(postElement, { decodeEntities: true });

    const postTableBody = $('tbody').first();
    const postCreatorDetails = postTableBody.children('tr:nth-child(2)').first();

    const fullTitleWithBoards = postTableBody.find('td > div:nth-child(2)').first();

    const postId = Number(
      fullTitleWithBoards
        .find('b > a')
        .attr('href')
        .match(/#msg(\d*)/)[1],
    );

    const topicId = Number(
      fullTitleWithBoards
        .find('b > a')
        .attr('href')
        .match(/topic=(\d*)/)[1],
    );

    const title = fullTitleWithBoards.find('b > a').text().trim();
    const author = postCreatorDetails.find('td.catbg > span.middletext > a:last-child').first().text();
    const topicAuthor = postCreatorDetails.find('td.catbg > span.middletext > a:nth-child(1)').first().text();

    if (!topicAuthor) {
      logger.error(
        {
          elementHtml: postCreatorDetails.find('td.catbg > span.middletext > a:nth-child(1)').first().html(),
          author,
          postId,
          topicId,
        },
        '[PostScraper] topicAuthor missing in recent post',
      );
    }

    const authorUid = Number(
      postCreatorDetails
        .find('td.catbg > span.middletext > a:last-child')
        .first()
        .attr('href')
        .match(/u=(\d*)/)[1],
    );

    const content = $('.post').html();

    const today = `${currentDate.getUTCFullYear()}/${currentDate.getUTCMonth() + 1}/${currentDate.getUTCDate()}`;
    const date = new Date(
      $(postElement).find('td.middletext > div:nth-child(3)').text().replace('on: Today at', today).trim(),
    );

    const boards = $(fullTitleWithBoards).find('a');
    const boardsArray: number[] = [];

    for (const [index, board] of Array.from(boards).entries()) {
      const boardIdRegEx = /board=(\d+)/;
      const boardUrl = $(board).attr('href');

      if (boardUrl.startsWith('https://bitcointalk.org/index.php?board=')) {
        if (index < boards.length - 1) {
          const boardId = boardUrl.match(boardIdRegEx)[1];

          boardsArray.push(Number(boardId));
        }
      }
    }

    $ = load(footerElement);

    const topicReplies = Number(
      $('td.maintab_back > a:nth-child(1)')
        .attr('href')
        .match(/topic=\d+\.(\d+)/)
        .at(1),
    );

    const post = this.postsRepository.create({
      post_id: postId,
      topic_id: topicId,
      title,
      author,
      author_uid: authorUid,
      content,
      date,
      boards: [],
      board_id: boardsArray[boardsArray.length - 1],
      checked: false,
      notified: false,
      notified_to: [],
    });

    post.topicAuthor = topicAuthor;
    post.topicReplies = topicReplies;

    return post;
  }

  private async processPost(post: Post): Promise<Post | undefined> {
    const scrapedPostKey = `scrapedRecentPost:${post.post_id}`;

    try {
      const existingPostOnRedis = await this.redisProvider.recover<string>(scrapedPostKey);
      if (existingPostOnRedis)
        return;

      const existingPostOnDb = await this.postsRepository.findOne({ where: { post_id: post.post_id } });

      if (!existingPostOnDb) {
        await this.postsRepository.save(post);
        await this.redisProvider.save(scrapedPostKey, true, 'EX', 1800); // 30 minutes
        logger.debug(`[PostScraper] Saved post ${post.post_id}`);

        await this.schedulePostRescrape(post.post_id, 5);
        await this.schedulePostRescrape(post.post_id, 30);
        await this.schedulePostRescrape(post.post_id, 60 * 24 * 7); // 1 week

        if (post.topicAuthor === post.author && post.topicReplies === 0) {
          const existingTopic = await this.topicsRepository.findOne({ where: { topic_id: post.topic_id } });
          if (!existingTopic) {
            const topic = this.topicsRepository.create({ post_id: post.post_id, topic_id: post.topic_id });
            await this.topicsRepository.save(topic);
            logger.debug(`[PostScraper] Created topic ${topic.topic_id}`);
          }
        }
        else {
          const existingTopic = await this.topicsRepository.findOne({ where: { topic_id: post.topic_id } });
          if (!existingTopic) {
            await addForumScraperJob('scrapeTopic', { topic_id: post.topic_id }, false);
          }
        }
      }
      else {
        await this.redisProvider.save(scrapedPostKey, true, 'EX', 1800); // 30 minutes
        logger.debug(`[PostScraper] Post ${post.post_id} already exists.`);
      }
    }
    catch (error) {
      logger.error({ error, postId: post.post_id }, `[PostScraper] Error processing post ${post.post_id}`);
    }
  }

  async scrapeRecentPosts(): Promise<Post[]> {
    try {
      const scrapedPosts = [];

      const { $ } = await this.ensureLoggedIn(this.RECENT_POSTS_URL);
      const currentDate = this.extractCurrentDate($);
      const recentPostsWithFooter = this.extractPostsWithFooters($);

      for await (const recentPostElement of recentPostsWithFooter) {
        const post = this.parseRecentPostElement(recentPostElement, currentDate);
        const insertedPost = await this.processPost(post);
        if (insertedPost) {
          scrapedPosts.push(insertedPost);
        }
      }

      return scrapedPosts;
    }
    catch (error) {
      logger.error({ error }, '[PostScraper] Error scraping recent posts');
      return [];
    }
  }

  async scrapePost(postId: number): Promise<ParsedPost> {
    const { html } = await this.ensureLoggedIn(`index.php?topic=*.msg${postId}`, {
      validateStatus: status => (status >= 200 && status < 300) || status === 404,
    });

    return parsePostHtml(html, postId);
  }

  async scrapePostVersion(postId: number): Promise<PostVersion | null> {
    const result = await scrapePostVersion(postId);

    if (result) {
      await this.redisProvider.save(`lastPostRescrapedDate:${postId}`, result.created_at);
    }

    return result;
  }

  async getLastPostScrapeDate(postId: number): Promise<Date | null> {
    const lastDateString = await this.redisProvider.recover<string>(`lastPostRescrapedDate:${postId}`);

    if (!lastDateString) {
      return null;
    }

    return new Date(lastDateString);
  }

  async scrapeTopicOp(topicId: number): Promise<ParsedTopicPost> {
    const { html } = await this.ensureLoggedIn(`index.php?topic=${topicId}`, {
      validateStatus: status => (status >= 200 && status < 300) || status === 404,
    });
    const topicPost = parseTopicPostOpHtml(html);

    if (!topicPost.success) {
      return { success: false, post: null, failedReason: topicPost.failedReason };
    }

    let post = await this.postsRepository.findOne({ where: { post_id: topicPost.post.post_id } });
    if (!post) {
      post = await this.postsRepository.save(topicPost.post);
    }

    let topic = await this.topicsRepository.findOne({ where: { topic_id: topicId } });
    if (!topic) {
      topic = await this.topicsRepository.save(topicPost.topic);
    }

    return { success: true, post, topic, failedReason: null };
  }

  async schedulePostRescrape(postId: number, minutes: number): Promise<void> {
    const dateUnix = addMinutes(new Date(), minutes).getTime();
    const rescrapeKey = `rescrapePost:${postId}:${dateUnix}`;
    await this.redisProvider.save(rescrapeKey, {
      time: dateUnix,
      post_id: postId,
    });
  }

  async getScheduledPostRescrapes(): Promise<RescrapeSchedule[]> {
    const rescrapeSchedules = await this.redisProvider.recoverByPrefix<RescrapeSchedule>('rescrapePost:*');
    return rescrapeSchedules.sort((a, b) => a.time - b.time);
  }

  async deleteScheduledPostRescrape(schedule: RescrapeSchedule): Promise<void> {
    await this.redisProvider.invalidate(`rescrapePost:${schedule.post_id}:${schedule.time}`);
  }
}
