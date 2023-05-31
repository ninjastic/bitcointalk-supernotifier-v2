import 'dotenv/config';
import 'reflect-metadata';
import cheerio from 'cheerio';
import { container } from 'tsyringe';
import { createConnection, getManager } from 'typeorm';
import iconv from 'iconv-lite';
import axios from 'axios';
import { sub } from 'date-fns';
import inquirer from 'inquirer';

import '../../container';

import Post from '../../../modules/posts/infra/typeorm/entities/Post';

import CreatePostService from '../../../modules/posts/services/CreatePostService';

const sleep = ms =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

const scrapePostFromBuffer = buffer => {
  const utf8String = iconv.decode(buffer, 'ISO-8859-1');

  const $ = cheerio.load(utf8String, { decodeEntities: true });

  const notFound = $('body > h3:nth-child(2) > strong').text();

  if (notFound === "The page you're looking for doesn't exist.") {
    return 404;
  }

  const post_id = Number($('body > b > a:nth-child(1)').text());
  const post_url = $('body > b > a:nth-child(1)').attr('href');
  const topic_id = Number(post_url.match(/topic=(\d+)\./i)[1]);
  const author = $('body > b > a:nth-child(2)').text();

  if (!author) return null;

  const author_url = $('body > b > a:nth-child(2)').attr('href');
  const author_uid = Number(author_url.match(/u=(\d+)/i)[1]);
  const dateRaw = $('body')
    .html()
    .match(/scraped on (.*)\):/i)[1];
  const dateFull = dateRaw.match(/\w{3}\s+(\w{3})\s+(\d+) .* \w+\s+(\d+)/i);
  const date = `${dateFull[1]} ${dateFull[2]} ${dateFull[3]}`;
  const hourFull = dateRaw.match(/\w{3}\s+\w{3}\s+\d+\s+(.*)\s+\w+\s+\d+/i);
  const hour = hourFull[1];
  const dateHour = `${date} ${hour}`;
  const dateFixed = new Date(dateHour);
  const content = $('div.post').html();
  const title = '(Unknown Title)';

  if (!author_uid || !content || (content && !content.trim()) || !post_id) {
    return null;
  }

  if (author_uid && author_uid >= 999999999) return null;

  const boards = [];
  const checked = false;
  const notified = false;
  const notified_to = [];
  const archive = true;

  const post = {
    post_id,
    topic_id,
    title,
    author,
    author_uid,
    content,
    date: sub(dateFixed, { hours: 2 }),
    boards,
    checked,
    notified,
    notified_to,
    archive
  };

  return post;
};

type PromptResponse = {
  from: string;
  to: string;
};

createConnection().then(async () => {
  const manager = getManager();
  const createPost = container.resolve(CreatePostService);

  const { from, to } = await inquirer
    .prompt<PromptResponse>([
      {
        type: 'input',
        name: 'from',
        message: 'From Id',
        validate: value => !Number.isNaN(Number(value))
      },
      {
        type: 'input',
        name: 'to',
        message: 'To Id',
        validate: value => !Number.isNaN(Number(value))
      }
    ])
    .catch(() => process.exit());

  console.log(`Scraping range: ${from} ~ ${to}`);

  const numberOfPosts = Number(to) - Number(from);
  const loop = new Array(numberOfPosts);

  let operations = [];
  let sinceLastBatch = 0;

  for await (const [n] of loop.entries()) {
    const currentId = Number(from) + Number(n);
    const currentIdFolder = currentId.toString().substring(0, 4);

    const exists = await manager.query('SELECT post_id FROM posts WHERE post_id = $1', [currentId]);

    if (exists) {
      console.log('Exists', currentId);
    } else {
      const response = await axios.get(`https://loyce.club/archive/posts/${currentIdFolder}/${currentId}.html`);

      const post = scrapePostFromBuffer(response.data);

      if (post === 404) {
        console.log(`${currentId} not found.`);
      } else if (post.post_id) {
        const postCreated = createPost.execute(post as Post);

        if (postCreated.post_id) {
          console.log('Scraped', currentIdFolder, currentId, operations.length);
          operations.push(postCreated);
          sinceLastBatch += 1;

          if (sinceLastBatch >= 50) {
            console.log('Inserting', operations.length);
            await manager
              .createQueryBuilder()
              .insert()
              .into(Post)
              .values(operations)
              .onConflict('("post_id") DO NOTHING')
              .execute();

            operations = [];
            sinceLastBatch = 0;
          }
        }
      } else {
        console.log('ERRO >>', currentIdFolder, currentId);
      }

      await sleep(500);
    }
  }

  if (operations.length) {
    await manager
      .createQueryBuilder()
      .insert()
      .into(Post)
      .values(operations)
      .onConflict('("post_id") DO NOTHING')
      .execute();
  }

  console.log('-- Finished -- ');
});
