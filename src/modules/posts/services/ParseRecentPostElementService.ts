import cheerio from 'cheerio';
import { inject, injectable } from 'tsyringe';

import IPostsRepository from '../repositories/IPostsRepository';
import { RecentPostWithFooter } from '../repositories/IScrapePostsRepository';

import logger from '../../../shared/services/logger';
import Post from '../infra/typeorm/entities/Post';

@injectable()
export default class ParseRecentPostElementService {
  constructor(
    @inject('PostsRepository')
    private postsRepository: IPostsRepository
  ) {}

  public execute(recentPost: RecentPostWithFooter, currentDate: Date): Post {
    const { postElement, footerElement } = recentPost;
    let $ = cheerio.load(postElement, { decodeEntities: true });

    const fullTitleWithBoards = $('tbody > tr.titlebg2 > td > div:nth-child(2)');

    const postId = Number(
      fullTitleWithBoards
        .find('b > a')
        .attr('href')
        .match(/#msg(\d*)/)[1]
    );

    const topicId = Number(
      fullTitleWithBoards
        .find('b > a')
        .attr('href')
        .match(/topic=(\d*)/)[1]
    );

    const title = fullTitleWithBoards.find('b > a').text().trim();
    const author = $('tr:nth-child(2) > td > span > a:nth-child(2)').text();
    const topicAuthor = $('tr:nth-child(2) > td > span > a:nth-child(1)').text();

    if (!topicAuthor) {
      logger.error(
        {
          elementHtml: $('tr:nth-child(2) > td > span > a:nth-child(1)').html(),
          author,
          postId,
          topicId
        },
        '[ParseRecentPostElementService] topicAuthor missing in recent post'
      );
    }

    const authorUid = Number(
      $('tr:nth-child(2) > td > span > a:nth-child(2)')
        .attr('href')
        .match(/u=(\d*)/)[1]
    );

    const content = $('.post').html();

    const today = `${currentDate.getUTCFullYear()}/${currentDate.getUTCMonth() + 1}/${currentDate.getUTCDate()}`;

    const date = new Date(
      $(postElement).find('td.middletext > div:nth-child(3)').text().replace('on: Today at', today).trim()
    );

    const boards = $(fullTitleWithBoards).find('a');
    const boardsArray: number[] = [];

    for (const [index, board] of Array.from(boards).entries()) {
      const boardIdRegEx = /board=(\d+)/;
      const boardUrl = $(board).attr('href');

      if (boardUrl.startsWith('https://bitcointalk.org/index.php?board=')) {
        if (index < boards.length - 1) {
          const boardId = boardUrl.match(boardIdRegEx)[1];

          boardsArray.push(Number(boardId));
        }
      }
    }

    $ = cheerio.load(footerElement);

    const topicReplies = Number(
      $('td.maintab_back > a:nth-child(1)')
        .attr('href')
        .match(/topic=\d+\.(\d+)/)
        .at(1)
    );

    const post = this.postsRepository.create({
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

    post.topicAuthor = topicAuthor;
    post.topicReplies = topicReplies;

    return post;
  }
}
