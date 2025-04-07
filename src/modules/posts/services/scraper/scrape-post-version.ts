import { container } from 'tsyringe';
import { load } from 'cheerio';
import { getRepository } from 'typeorm';
import { PostScraper } from '##/modules/posts/services/scraper/post-scraper';
import { format } from 'date-fns';
import getPost from '##/modules/posts/services/get-post';

import PostVersion from '##/modules/posts/infra/typeorm/entities/PostVersion';

function fixPostContentWithTodayQuoteDate(content: string, date: Date): string {
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

  return $('body').html();
}

export async function scrapePostVersion(postId: number): Promise<PostVersion | null> {
  const postScraper = container.resolve<PostScraper>('PostScraper');
  const postsVersionsRepository = getRepository(PostVersion);

  const latestPostVersion = await postsVersionsRepository.findOne({
    where: { post_id: postId },
    order: { created_at: 'DESC' }
  });

  if (latestPostVersion?.deleted) {
    return null;
  }

  const { post: currentPost } = await postScraper.scrapePost(postId);

  if (!currentPost?.title) {
    const postVersion = postsVersionsRepository.create({
      post_id: postId,
      deleted: true
    });

    await postsVersionsRepository.save(postVersion);
    return postVersion;
  }

  const savedPost = await getPost({ postId, shouldCache: true, shouldScrape: false });

  if (!savedPost) {
    return null;
  }

  const previousPostToCompare = { title: savedPost.title, content: savedPost.content };

  if (latestPostVersion) {
    if (latestPostVersion.new_title) {
      previousPostToCompare.title = latestPostVersion.new_title;
    }

    if (latestPostVersion.new_content) {
      previousPostToCompare.content = latestPostVersion.new_content;
    }
  }

  const newPostVersion = postsVersionsRepository.create({
    post_id: postId,
    edit_date: currentPost.edited
  });

  if (previousPostToCompare.title !== currentPost.title) {
    newPostVersion.new_title = currentPost.title;
  }

  if (
    fixPostContentWithTodayQuoteDate(previousPostToCompare.content, savedPost.date) !==
    fixPostContentWithTodayQuoteDate(currentPost.content, savedPost.date)
  ) {
    newPostVersion.new_content = currentPost.content;
  }

  if (newPostVersion.new_title || newPostVersion.new_content) {
    await postsVersionsRepository.save(newPostVersion);
    return newPostVersion;
  }

  return null;
}
