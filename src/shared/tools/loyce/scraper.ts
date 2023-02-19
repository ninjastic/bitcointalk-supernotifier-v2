/* eslint-disable no-console */
import 'dotenv/config';
import 'reflect-metadata';
import cheerio from 'cheerio';
import path from 'path';
import fs from 'fs-extra';

import { container } from 'tsyringe';
import { createConnection, getManager } from 'typeorm';
import del from 'del';
import iconv from 'iconv-lite';
import { sub } from 'date-fns';

import '../../infra/typeorm';
import '../../container';

import Post from '../../../modules/posts/infra/typeorm/entities/Post';

import CreatePostService from '../../../modules/posts/services/CreatePostService';

const filesBasePath = process.argv[2];
const extractedBasePath = process.argv[3];

console.log(filesBasePath);
console.log(extractedBasePath);

if (!fs.pathExists(extractedBasePath)) {
  fs.mkdirSync(extractedBasePath);
}

const readDir = async dir => {
  const files = await fs.readdir(dir);

  return files;
};

const scrapePostFromBuffer = buffer => {
  const utf8String = iconv.decode(buffer, 'ISO-8859-1');

  const $ = cheerio.load(utf8String, { decodeEntities: true });

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

createConnection().then(async () => {
  const manager = getManager();
  const createPost = container.resolve(CreatePostService);

  const folders = await readDir(path.resolve(filesBasePath));
  const foldersSorted = folders.sort((a, b) => Number(a) - Number(b));

  for await (const folder of foldersSorted) {
    console.time(folder);
    const folderFullDir = path.resolve(filesBasePath, folder);
    const files = await readDir(folderFullDir);
    const extractedFullPath = path.resolve(filesBasePath, folder);

    let operations = [];
    let sinceLastBatch = 0;

    for await (const file of files) {
      const fileContent = await fs.readFile(path.resolve(filesBasePath, folder, file));

      const post = scrapePostFromBuffer(fileContent);
      const postCreated = createPost.execute(post);

      if (postCreated.post_id) {
        operations.push(postCreated);
        sinceLastBatch += 1;

        if (sinceLastBatch >= 5000) {
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

    fs.appendFile(path.resolve(filesBasePath, 'done.txt'), `${folder},`, err => {
      if (err) throw err;
    });

    await del(folderFullDir, { force: true });
    await del(extractedFullPath, { force: true });
    console.log(`${new Date()}`);
    console.timeEnd(folder);
    console.log(`${Number(folder)} / ${foldersSorted.length} (${(Number(folder) * 100) / foldersSorted.length}%)`);
    console.log('------------------------------');
  }

  console.log('-- Finished -- ');
});
