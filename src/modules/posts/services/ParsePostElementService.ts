import cheerio from 'cheerio';
import { container } from 'tsyringe';
import { isValid } from 'date-fns';

import logger from '../../../shared/services/logger';
import Post from '../infra/typeorm/entities/Post';

import CreatePostService from './CreatePostService';

interface Data {
  html: string;
  topic_id: number;
  post_id: number;
}

export default class ParsePostElementService {
  public execute({ html, topic_id, post_id }: Data): Post | null {
    const createPost = container.resolve(CreatePostService);

    const $ = cheerio.load(html, { decodeEntities: true });

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
      logger.info(`Topic ${topic_id} of post ${post_id} was not found or is off limit`);
      return null;
    }

    const postsContainer = $('#quickModForm > table.bordercolor');

    const postElement = $(postsContainer)
      .find('tbody > tr > td > table > tbody > tr > td > table > tbody > tr')
      .toArray()
      .find(postContainer => {
        const postHeader = $(postContainer).find("td.td_headerandpost td > div[id*='subject'] > a");
        return postHeader.length && $(postHeader).attr('href').includes(`topic=${topic_id}.msg${post_id}`);
      });

    if (!postElement) {
      logger.info(`Post ${post_id} not found on topic ${topic_id}`);
      return null;
    }

    const postHeader = $(postElement).find("td.td_headerandpost td > div[id*='subject'] > a");
    const title = postHeader.text().trim();

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
    const today = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;

    const date = new Date(
      $(postElement)
        .find('td.td_headerandpost table div:nth-child(2)')
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

    const post = createPost.execute({
      post_id,
      topic_id,
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

    return post;
  }
}
