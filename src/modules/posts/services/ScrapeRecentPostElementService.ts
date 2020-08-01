import cheerio from 'cheerio';
import { inject, injectable } from 'tsyringe';

import Post from '../infra/schemas/Post';

import IPostsRepository from '../repositories/IPostsRepository';

@injectable()
export default class ScrapeRecentPostElementService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository,
  ) {}

  public execute(element: CheerioElement): Post {
    const $ = cheerio.load(element);

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

    const title = fullTitleWithBoards.find('b > a').text();

    const author = $('tr:nth-child(2) > td > span > a:nth-child(1)').text();

    const author_uid = Number(
      $('tr:nth-child(2) > td > span > a:nth-child(1)')
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
    const boardsArray: string[] = [];

    $(boards).each((boardIndex, board) => {
      const { length } = boards;
      const boardName = $(board).text();

      if (boardIndex < length - 1) {
        boardsArray.push(boardName);
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
      boards: boardsArray,
    });

    return post;
  }
}
