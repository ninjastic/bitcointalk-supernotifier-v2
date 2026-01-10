import Post from '##/modules/posts/infra/typeorm/entities/Post';
import Topic from '##/modules/posts/infra/typeorm/entities/Topic';
import logger from '##/shared/services/logger';
import { load } from 'cheerio';
import { isValid, sub } from 'date-fns';
import { getRepository } from 'typeorm';

export interface ParsedPost {
  success: boolean;
  failedReason: string | null;
  scrapedForumDate?: Date;
  post: Post | null;
  topic?: Topic;
  pagePosts: Post[];
}

async function parsePostHtml(
  html: string,
  postId: number,
): Promise<ParsedPost> {
  const postsRepository = getRepository(Post);
  const topicsRepository = getRepository(Topic);

  const $ = load(html, { decodeEntities: true });

  const topicNotFound
    = $('#bodyarea > div:nth-child(1) > table > tbody > tr.windowbg > td')
      ?.text()
      ?.trim()
      === 'The topic or board you are looking for appears to be either missing or off limits to you.';

  const topicOffLimit
    = $('#frmLogin > table > tbody > tr.catbg > td')?.text()?.trim()
      === 'Warning!'
      && $('form table tr td.windowbg')
        ?.text()
        ?.trim()
        .includes(
          'The topic or board you are looking for appears to be either missing or off limits to you.',
        );

  if (topicNotFound || topicOffLimit) {
    logger.info(
      `[ParsePostElementService] Topic of post ${postId} was not found or is off limit`,
    );
    return {
      success: false,
      post: null,
      pagePosts: [],
      failedReason: 'Topic not found',
    };
  }

  const forumDateString = $(
    'body > div.tborder > table:nth-child(2) > tbody > tr:nth-child(1) > td:nth-child(2) > span',
  ).text();

  const scrapeDate = sub(new Date(forumDateString), {
    minutes: new Date().getTimezoneOffset(),
  });

  const titleBoard = $('#bodyarea > div > div > b').parent();

  const boards = $(titleBoard).find('b');
  const boardsArray = [];

  $(boards).each(async (boardIndex, board) => {
    const { length } = boards;

    const boardIdRegEx = /board=(\d+)/;
    const boardUrl = $(board).find('a').attr('href');

    if (!boardUrl.startsWith('https://bitcointalk.org/index.php?board='))
      return;

    if (boardIndex < length - 1 && boardIndex !== 0) {
      const boardId = boardUrl.match(boardIdRegEx)[1];

      boardsArray.push(Number(boardId));
    }
  });

  const isTopicFirstPage
    = $('#bodyarea > table:not(.tborder)')
      .filter((_, el) => $(el).text().includes('Pages'))
      .first()
      .find('tbody > tr > td.middletext > b')
      .first()
      .text() === '1';

  const postsContainer = $('#quickModForm > table.bordercolor');

  const postsElements = $(postsContainer)
    .find(
      'tbody > tr > td > table > tbody > tr > td > table > tbody > tr:has(td.td_headerandpost td > div[id*=\'subject\'])',
    )
    .toArray();

  const pagePosts = postsElements.map((postElement) => {
    const postHeader = $(postElement).find(
      'td.td_headerandpost td > div[id*=\'subject\'] > a',
    );
    const title = postHeader.text().trim();
    const postId = Number(
      postHeader
        .attr('href')
        .match(/msg(\d+)/)
        ?.at(1),
    );
    const topicId = Number(
      postHeader
        .attr('href')
        .match(/topic=(\d+)/)
        ?.at(1),
    );

    const authorElement = $(postElement).find('td.poster_info > b > a');
    const author = authorElement.html() ?? 'Guest';
    const authorUrl = author && authorElement.attr('href');
    const authorUid = authorUrl
      ? Number(
          authorUrl.replace(
            'https://bitcointalk.org/index.php?action=profile;u=',
            '',
          ),
        )
      : -1;

    const content = $(postElement)
      .find('td.td_headerandpost div.post')
      .html();

    const d = new Date();
    const today = `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;

    const date = new Date(
      $(postElement)
        .find(
          'td.td_headerandpost > table:nth-child(1) div:nth-child(2)',
        )
        .text()
        .replace('Today at', today)
        .replace(/Last edit:.*/, ''),
    );

    const editedDateTitle = $(postElement)
      .find('span.edited')
      .attr('title');

    const editedDate = editedDateTitle
      ? new Date(
          editedDateTitle
            .replace('Today at', today)
            .replace(/Last edit:.*/, '')
            .trim(),
        )
      : null;

    const post = postsRepository.create({
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

    post.edited = isValid(editedDate) ? editedDate : null;

    return post;
  });

  let topic: Topic | undefined;

  if (isTopicFirstPage && pagePosts[0]) {
    topic = topicsRepository.create({
      post_id: pagePosts[0].post_id,
      topic_id: pagePosts[0].topic_id,
    });
  }

  const targetPost = pagePosts.find(post => post.post_id === postId);

  return {
    success: true,
    post: targetPost,
    pagePosts,
    topic,
    failedReason: null,
    scrapedForumDate: scrapeDate,
  };
}

export default parsePostHtml;
