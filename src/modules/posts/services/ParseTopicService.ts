import cheerio from 'cheerio';
import { container } from 'tsyringe';

import Post from '../infra/typeorm/entities/Post';

import CreatePostService from './CreatePostService';

interface Data {
  html: string;
  topic_id: number;
}

export default class ParseTopicService {
  public execute({ html, topic_id }: Data): Post {
    const createPost = container.resolve(CreatePostService);

    const $ = cheerio.load(html, { decodeEntities: true });
    const posts = $('#quickModForm > table.bordercolor');

    let post = {} as Post;
    let found = false;

    $(posts)
      .find('tbody > tr > td > table > tbody > tr > td > table > tbody > tr')
      .toArray()
      .forEach(e => {
        const postHeader = $(e).find("td.td_headerandpost td > div[id*='subject'] > a");

        if (postHeader && postHeader.attr('href')) {
          if (!found) {
            const receiver = $(e).find('td.poster_info > b > a');

            const post_id = Number(
              $(postHeader)
                .attr('href')
                .match(/\d\.msg(\d+)#msg/i)[1]
            );
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
            const today = `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;

            const date = new Date(
              $(e)
                .find('td.td_headerandpost table:nth-child(1) div:nth-child(2)')
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

            found = true;
          }
        }
      });

    return post;
  }
}
