import cheerio from 'cheerio';
import { inject, injectable } from 'tsyringe';

import IPostsRepository from '../repositories/IPostsRepository';

import Post from '../infra/typeorm/entities/Post';

@injectable()
export default class ParseRecentPostElementService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,
  ) {}

  public execute(element: CheerioElement): Post {
    const $ = cheerio.load(element, { decodeEntities: true });

    const fullTitleWithBoards = $(
      'tbody > tr.titlebg2 > td > div:nth-child(2)',
    );

    const post_id = Number(
      fullTitleWithBoards
        .find('b > a')
        .attr('href')
        .match(/#msg(\d*)/)[1],
    );

    const topic_id = Number(
      fullTitleWithBoards
        .find('b > a')
        .attr('href')
        .match(/topic=(\d*)/)[1],
    );

    const title = fullTitleWithBoards.find('b > a').text().trim();

    const author = $('tr:nth-child(2) > td > span > a:nth-child(2)').text();

    const author_uid = Number(
      $('tr:nth-child(2) > td > span > a:nth-child(2)')
        .attr('href')
        .match(/u=(\d*)/)[1],
    );

    const content = $('.post').html();

    const d = new Date();
    const today = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;

    const date = new Date(
      $(element)
        .find('td.middletext > div:nth-child(3)')
        .text()
        .replace('on: Today at', today)
        .trim(),
    );

    const boards = $(fullTitleWithBoards).find('a');
    const boardsArray: number[] = [];

    $(boards).each((boardIndex, board) => {
      const { length } = boards;
      const boardIdRegEx = new RegExp('board=(\\d+)');
      const boardUrl = $(board).attr('href');

      if (!boardUrl.startsWith('https://bitcointalk.org/index.php?board='))
        return;

      if (boardIndex < length - 1) {
        const boardId = boardUrl.match(boardIdRegEx)[1];

        boardsArray.push(Number(boardId));
      }
    });

    const post = this.postsRepository.create({
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
      notified_to: [],
    });

    return post;
  }
}
