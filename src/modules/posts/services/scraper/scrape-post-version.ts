import type { PostScraper } from '##/modules/posts/services/scraper/post-scraper';
import type RedisProvider from '##/shared/container/providers/implementations/RedisProvider';

import PostVersion from '##/modules/posts/infra/typeorm/entities/PostVersion';
import getPost from '##/modules/posts/services/get-post';
import logger from '##/shared/services/logger';
import { load } from 'cheerio';
import { format } from 'date-fns';
import { container } from 'tsyringe';
import { getRepository, IsNull, Not } from 'typeorm';

import type Post from '../../infra/typeorm/entities/Post';

export function extractImageUrl(url: string) {
  try {
    const urlObj = new URL(url);
    const imageUrl = urlObj.searchParams.get('u');
    return imageUrl ? decodeURIComponent(imageUrl) : url;
  }
  catch (error) {
    return url;
  }
}

function normalizePostContent(content: string, date: Date): string {
  const $ = load(content);

  $('.quoteheader').each((_, quoteHeader) => {
    const hasTodayDate = $(quoteHeader)
      .html()
      .match(/<b>Today<\/b>/);
    if (hasTodayDate) {
      const fixedHtml = $(quoteHeader)
        .html()
        .replace(/<b>Today<\/b> at/, format(date, 'LLLL dd, yyyy,'));
      $(quoteHeader).html(fixedHtml);
    }
  });

  $('img.userimg').each((_, el) => {
    const src = $(el).attr('src');
    if (src && src.includes('bitcointalk.org')) {
      const fixedSrc = extractImageUrl(src);
      const proxyBaseUrl = '/api/img?url=';
      if (fixedSrc.startsWith('https://talkimg.com/images/')) {
        $(el).attr('src', fixedSrc);
      }
      else {
        $(el).attr('src', proxyBaseUrl + fixedSrc);
      }
    }
  });

  return $('body').html();
}

export async function getLatestPostVersion(postId: number): Promise<{ lastTitle: string | null; lastContent: string | null; deleted: boolean }> {
  const postsVersionsRepository = getRepository(PostVersion);

  const lastTitle = await postsVersionsRepository.findOne({
    where: { post_id: postId, new_title: Not(IsNull()) },
    order: { created_at: 'DESC' },
  });

  const lastContent = await postsVersionsRepository.findOne({
    where: { post_id: postId, new_content: Not(IsNull()) },
    order: { created_at: 'DESC' },
  });

  const deleted = await postsVersionsRepository.findOne({
    where: { post_id: postId, deleted: true },
    order: { created_at: 'DESC' },
  });

  return {
    lastTitle: lastTitle?.new_title,
    lastContent: lastContent?.new_content,
    deleted: !!deleted,
  };
}

export async function generatePostNewEditedVersion(postId: number, currentLivePost: Post): Promise<PostVersion | null> {
  const postsVersionsRepository = getRepository(PostVersion);
  const latestPostVersionChanges = await getLatestPostVersion(postId);

  if (latestPostVersionChanges.deleted) {
    logger.debug(`Skipping scrape post version id ${postId} because post was previously detected as deleted`);
    return null;
  }

  const savedPost = await getPost({ postId, shouldCache: true, shouldScrape: false });

  if (!savedPost) {
    return null;
  }

  const previousPostToCompare = { title: savedPost.title, content: savedPost.content };

  if (latestPostVersionChanges.lastTitle) {
    previousPostToCompare.title = latestPostVersionChanges.lastTitle;
  }

  if (latestPostVersionChanges.lastContent) {
    previousPostToCompare.content = latestPostVersionChanges.lastContent;
  }

  const fixedPreviousPostContent = normalizePostContent(previousPostToCompare.content, savedPost.date);
  const fixedCurrentLivePostContent = normalizePostContent(currentLivePost.content, savedPost.date);

  const hasTitleChanged = previousPostToCompare.title !== currentLivePost.title;
  const hasContentChanged = fixedPreviousPostContent !== fixedCurrentLivePostContent;

  if (!hasTitleChanged && !hasContentChanged) {
    logger.debug(`Post version check id ${postId} - title and content have not changed`);
    return null;
  }

  const newPostVersion = postsVersionsRepository.create({
    post_id: postId,
    edit_date: currentLivePost.edited,
  });

  if (hasTitleChanged) {
    newPostVersion.new_title = currentLivePost.title;
  }

  if (hasContentChanged) {
    newPostVersion.new_content = currentLivePost.content;
  }

  return newPostVersion;
}

export async function scrapePostVersion(postId: number): Promise<PostVersion[]> {
  const postsVersionsRepository = getRepository(PostVersion);
  const postScraper = container.resolve<PostScraper>('PostScraper');
  const redisProvider = container.resolve<RedisProvider>('CacheRepository');

  const newPostVersions = [];

  const { post: currentPostLiveVersion, pagePosts, scrapedForumDate } = await postScraper.scrapePost(postId);

  if (currentPostLiveVersion) {
    const newVersion = await generatePostNewEditedVersion(postId, currentPostLiveVersion);
    if (newVersion) {
      logger.debug(`Post version check id ${postId} - new version created`);
      const savedNewVersion = await postsVersionsRepository.save(newVersion);
      newPostVersions.push(savedNewVersion);
    }
    await redisProvider.save(`lastPostRescrapedDate:${postId}`, scrapedForumDate.toISOString());
  }
  else {
    const deletedPostVersionExists = await postsVersionsRepository.findOne({
      where: { post_id: postId, deleted: true },
      order: { created_at: 'DESC' },
    });

    if (deletedPostVersionExists) {
      logger.debug(`Post version check id ${postId} - post was already deleted`);
      return;
    }

    const newDeletedPostVersion = postsVersionsRepository.create({
      post_id: postId,
      deleted: true,
    });

    const savedNewDeletedPostVersion = await postsVersionsRepository.save(newDeletedPostVersion);
    newPostVersions.push(savedNewDeletedPostVersion);
  }

  const otherLivePosts = pagePosts.filter(post => post.post_id !== postId);

  for (const post of otherLivePosts) {
    const newVersion = await generatePostNewEditedVersion(post.post_id, post);
    if (newVersion) {
      logger.debug(`Post version check id ${post.post_id} - new version created`);
      const savedNewVersion = await postsVersionsRepository.save(newVersion);
      newPostVersions.push(savedNewVersion);
    }
    await redisProvider.save(`lastPostRescrapedDate:${post.post_id}`, scrapedForumDate.toISOString());
  }

  return newPostVersions;
}
