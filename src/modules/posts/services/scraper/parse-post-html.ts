import { getRepository } from 'typeorm';
import { load } from 'cheerio';
import Post from '##/modules/posts/infra/typeorm/entities/Post';
import logger from '##/shared/services/logger';
import { isValid, sub } from 'date-fns';

export type ParsedPost = {
  success: boolean;
  post: Post | null;
  failedReason: string | null;
  scrapedForumDate?: Date;
};

const parsePostHtml = async (html: string, postId: number): Promise<ParsedPost> => {
  const postsRepository = getRepository(Post);

  const $ = load(html, { decodeEntities: true });

  const topicNotFound =
    $('#bodyarea > div:nth-child(1) > table > tbody > tr.windowbg > td')?.text()?.trim() ===
    'The topic or board you are looking for appears to be either missing or off limits to you.';

  const topicOffLimit =
    $('#frmLogin > table > tbody > tr.catbg > td')?.text()?.trim() === 'Warning!' &&
    $('form table tr td.windowbg')
      ?.text()
      ?.trim()
      .includes('The topic or board you are looking for appears to be either missing or off limits to you.');

  if (topicNotFound || topicOffLimit) {
    logger.info(`[ParsePostElementService] Topic of post ${postId} was not found or is off limit`);
    return { success: false, post: null, failedReason: 'Topic not found' };
  }

  const postsContainer = $('#quickModForm > table.bordercolor');

  const postElement = $(postsContainer)
    .find('tbody > tr > td > table > tbody > tr > td > table > tbody > tr')
    .toArray()
    .find(postContainer => {
      const postHeader = $(postContainer).find("td.td_headerandpost td > div[id*='subject'] > a");
      return postHeader.length && $(postHeader).attr('href').includes(`.msg${postId}`);
    });

  if (!postElement) {
    logger.info(`[ParsePostElementService] Post of id ${postId} not found`);
    return { success: false, post: null, failedReason: 'Post not found' };
  }

  const postHeader = $(postElement).find("td.td_headerandpost td > div[id*='subject'] > a");
  const title = postHeader.text().trim();
  const topicId = Number(
    postHeader
      .attr('href')
      .match(/topic=(\d+)/)
      ?.at(1)
  );

  const authorElement = $(postElement).find('td.poster_info > b > a');
  const author = authorElement.html();
  const authorUrl = author && authorElement.attr('href');
  const authorUid = author && Number(authorUrl.replace('https://bitcointalk.org/index.php?action=profile;u=', ''));

  const titleBoard = $('#bodyarea > div > div > b').parent();

  const boards = $(titleBoard).find('b');
  const boardsArray = [];

  $(boards).each(async (boardIndex, board) => {
    const { length } = boards;

    const boardIdRegEx = /board=(\d+)/;
    const boardUrl = $(board).find('a').attr('href');

    if (!boardUrl.startsWith('https://bitcointalk.org/index.php?board=')) return;

    if (boardIndex < length - 1 && boardIndex !== 0) {
      const boardId = boardUrl.match(boardIdRegEx)[1];

      boardsArray.push(Number(boardId));
    }
  });

  const content = $(postElement).find('td.td_headerandpost div.post').html();

  const d = new Date();
  const today = `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;

  const date = new Date(
    $(postElement)
      .find('td.td_headerandpost > table:nth-child(1) div:nth-child(2)')
      .text()
      .replace('Today at', today)
      .replace(/Last edit:.*/, '')
  );

  const editedDate =
    new Date(
      $(postElement)
        .find('span.edited')
        .text()
        .replace('Today at', today)
        .replace(/Last edit:.*/, '')
    ) || null;

  const forumDateString = $(
    'body > div.tborder > table:nth-child(2) > tbody > tr:nth-child(1) > td:nth-child(2) > span'
  ).text();

  const scrapeDate = sub(new Date(forumDateString), { minutes: new Date().getTimezoneOffset() });

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
    notified_to: []
  });

  post.edited = isValid(editedDate) ? editedDate : null;

  return { success: true, post, failedReason: null, scrapedForumDate: scrapeDate };
};

export default parsePostHtml;
