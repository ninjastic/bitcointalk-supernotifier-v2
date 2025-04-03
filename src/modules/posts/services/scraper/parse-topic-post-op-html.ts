import Post from '##/modules/posts/infra/typeorm/entities/Post';
import { load } from 'cheerio';
import { getRepository } from 'typeorm';

export type ParsedTopicPost = {
  success: boolean;
  post: Post | null;
  failed_reason: string | null;
};

const parseTopicPostOpHtml = (html: string): ParsedTopicPost => {
  const postsRepository = getRepository(Post);

  const $ = load(html, { decodeEntities: true });
  const posts = $('#quickModForm > table.bordercolor');

  const postElements = [...$(posts).find('tbody > tr > td > table > tbody > tr > td > table > tbody > tr')];

  const postElement = postElements.find(postElement => {
    const postHeader = $(postElement).find("td.td_headerandpost td > div[id*='subject'] > a");
    return postHeader && postHeader.attr('href');
  });

  if (!postElement) {
    return { success: false, post: null, failed_reason: 'No topic found' };
  }

  const postHeader = $(postElement).find("td.td_headerandpost td > div[id*='subject'] > a");

  const postId = Number(
    $(postHeader)
      .attr('href')
      .match(/\d\.msg(\d+)#msg/i)[1]
  );

  const topicId = Number(
    $(postHeader)
      .attr('href')
      .match(/topic=(\d+)/i)[1]
  );

  const authorElement = $(postElement).find('td.poster_info > b > a');

  const title = postHeader.text().trim();
  const author = authorElement.html();
  const authorUrl = authorElement.attr('href');
  const authorUid = Number(authorUrl.replace('https://bitcointalk.org/index.php?action=profile;u=', ''));

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

  return { success: true, post, failed_reason: null };
};

export default parseTopicPostOpHtml;
