import { inject, injectable } from 'tsyringe';
import cheerio from 'cheerio';

import api from '../../../shared/services/api';
import Post from '../infra/schemas/Post';

import IPostsRepository from '../repositories/IPostsRepository';

interface ScrapePostServiceData {
  topic_id: number;
  post_id: number;
}

@injectable()
export default class ScrapePostService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,
  ) {}

  public async execute({
    topic_id,
    post_id,
  }: ScrapePostServiceData): Promise<Post | null> {
    const response = await api.get(`index.php?topic=${topic_id}.msg${post_id}`);
    const $ = cheerio.load(response.data);

    const posts = $('#quickModForm > table.bordercolor');

    let post = {} as Post;

    $(posts)
      .find('tbody > tr > td > table > tbody > tr > td > table > tbody > tr')
      .toArray()
      .forEach(e => {
        const postHeader = $(e).find(
          "td.td_headerandpost td > div[id*='subject'] > a",
        );

        if (postHeader && postHeader.attr('href')) {
          if (
            $(postHeader)
              .attr('href')
              .includes(`topic=${topic_id}.msg${post_id}`)
          ) {
            const receiver = $(e).find('td.poster_info > b > a');

            const title = postHeader.text().trim();
            const author = receiver.html();
            const authorUrl = receiver.attr('href');
            const author_uid = Number(
              authorUrl.replace(
                'https://bitcointalk.org/index.php?action=profile;u=',
                '',
              ),
            );

            const titleBoard = $('#bodyarea > div > div > b').parent();

            const boards = $(titleBoard).find('b');
            const boardsArray = [];

            $(boards).each(async (boardIndex, board) => {
              const { length } = boards;
              const boardName = $(board).text();

              if (boardIndex < length - 1 && boardIndex !== 0) {
                boardsArray.push(boardName);
              }
            });

            const content = $(e).find('td.td_headerandpost div.post').html();

            const d = new Date();
            const today = `${d.getFullYear()}/${
              d.getMonth() + 1
            }/${d.getDate()}`;

            const date = new Date(
              $(e)
                .find('td.td_headerandpost table div:nth-child(2)')
                .text()
                .replace('Today at', today)
                .replace(/Last edit:.*/, ''),
            );

            const data = {
              post_id,
              topic_id,
              title,
              author,
              author_uid,
              content,
              date,
              boards: boardsArray,
            };

            post = this.postsRepository.create(data);
          }
        }
      });

    return post;
  }
}
