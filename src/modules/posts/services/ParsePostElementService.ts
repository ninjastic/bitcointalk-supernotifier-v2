import cheerio from 'cheerio';
import { container } from 'tsyringe';

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
    if (topicNotFound) {
      logger.info(`Topic ${topic_id} of post ${post_id} was not found`);
      return null;
    }

    const posts = $('#quickModForm > table.bordercolor');

    let post = {} as Post;

    $(posts)
      .find('tbody > tr > td > table > tbody > tr > td > table > tbody > tr')
      .toArray()
      .forEach(e => {
        const postHeader = $(e).find("td.td_headerandpost td > div[id*='subject'] > a");

        if (postHeader && postHeader.attr('href')) {
          if ($(postHeader).attr('href').includes(`topic=${topic_id}.msg${post_id}`)) {
            const receiver = $(e).find('td.poster_info > b > a');

            const title = postHeader.text().trim();
            const author = receiver.html();
            const authorUrl = receiver.attr('href');
            const author_uid = Number(authorUrl.replace('https://bitcointalk.org/index.php?action=profile;u=', ''));

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

            const content = $(e).find('td.td_headerandpost div.post').html();

            const d = new Date();
            const today = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;

            const date = new Date(
              $(e)
                .find('td.td_headerandpost table div:nth-child(2)')
                .text()
                .replace('Today at', today)
                .replace(/Last edit:.*/, '')
            );

            const editedDate = new Date(
              $(e)
                .find('span.edited')
                .text()
                .replace('Today at', today)
                .replace(/Last edit:.*/, '')
            );

            post = createPost.execute({
              post_id,
              topic_id,
              title,
              author,
              author_uid,
              content,
              date,
              boards: [],
              board_id: boardsArray[boardsArray.length - 1],
              checked: false,
              notified: false,
              notified_to: []
            });

            post.edited = editedDate;
          }
        }
      });

    return post;
  }
}
