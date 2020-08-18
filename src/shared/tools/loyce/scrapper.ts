import 'dotenv/config';
import 'reflect-metadata';
import cheerio from 'cheerio';
import path from 'path';
import fs from 'fs-extra';
import decompress from 'decompress';
import decompressTarbz from 'decompress-tarbz2';
import { container } from 'tsyringe';
import { createConnection, getManager } from 'typeorm';
import del from 'del';
import iconv from 'iconv-lite';

import '../../infra/typeorm';
import '../../container';

import Post from '../../../modules/posts/infra/typeorm/entities/Post';

import CreatePostService from '../../../modules/posts/services/CreatePostService';

const filesBasePath = process.argv[2];
const extractedBasePath = process.argv[3];

console.log(filesBasePath);
console.log(extractedBasePath);

const wait = ms => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

if (!fs.pathExists(extractedBasePath)) {
  fs.mkdirSync(extractedBasePath);
}

const readDir = async dir => {
  const files = await fs.readdir(dir);

  return files;
};

const decompressFile = async (file, dir) => {
  if (!fs.pathExists(dir)) {
    fs.mkdirSync(dir);
  }

  await decompress(file, dir, {
    plugins: [decompressTarbz()],
  });
};

const scrapePostFromBuffer = buffer => {
  const utf8String = iconv.decode(buffer, 'ISO-8859-1');

  const $ = cheerio.load(utf8String, { decodeEntities: false });

  const post_id = Number($('body > b:nth-child(1) > a').text());
  const post_url = $('body > b:nth-child(1) > a').attr('href');
  const topic_id = Number(post_url.match(/topic=(\d+)\./i)[1]);
  const author = $('body > b:nth-child(4) > a').text();

  if (!author) return null;

  const author_url = $('body > b:nth-child(4) > a').attr('href');
  const author_uid = Number(author_url.match(/u=(\d+)/i)[1]);
  const dateRaw = $('body')
    .html()
    .match(/scraped on (.*)\):/i)[1];
  const date = dateRaw.match(/(.*\d)_/i)[1];
  const hour = dateRaw.match(/_(\d+\.\d\d)/i)[1].replace('.', ':');
  const dateHour = `${date} ${hour}`;
  const dateFixed = new Date(dateHour);
  const content = $('div.post').html();
  const title = '(Unknown Title)';

  if (!author_uid || !content.trim() || !post_id) return null;

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
    date: dateFixed,
    boards,
    checked,
    notified,
    notified_to,
    archive,
  };

  return post;
};
console.log('lendo 1');

createConnection().then(async () => {
  console.log('lendo 2');
  const manager = getManager();
  const createPost = container.resolve(CreatePostService);

  console.log('lendo pasta');

  const folders = await readDir(path.resolve(filesBasePath));
  const foldersFiltered = folders.filter(folder => {
    return !folder.includes('.ts') && !folder.includes('extracted');
  });

  console.log(foldersFiltered);

  for await (const folder of foldersFiltered) {
    const folderFullDir = path.resolve(filesBasePath, folder);
    const files = await readDir(folderFullDir);
    const filesToDecompress = files.filter(file => {
      return file.includes('.tar.bz2');
    });

    for await (const file of filesToDecompress) {
      console.log(`decompressing ${folder} ${file}`);
      await decompressFile(
        path.resolve(filesBasePath, folder, file),
        path.resolve(extractedBasePath, folder),
      );
    }

    const extractedFullPath = path.resolve(extractedBasePath, folder);

    const filesExtracted = await readDir(extractedFullPath);

    let operations = [];
    let sinceLastBatch = 0;

    for await (const file of filesExtracted) {
      console.log(`file ${folder} ${file}`);
      const fileContent = await fs.readFile(
        path.resolve(extractedBasePath, folder, file),
      );

      const post = scrapePostFromBuffer(fileContent);
      const postCreated = createPost.execute(post);

      if (postCreated.post_id) {
        operations.push(postCreated);
        sinceLastBatch += 1;

        if (sinceLastBatch >= 5000) {
          console.log('executing batch');
          await manager
            .createQueryBuilder()
            .insert()
            .into(Post)
            .values(operations)
            .onConflict(`("post_id") DO NOTHING`)
            .execute();

          operations = [];
          sinceLastBatch = 0;
        }
      }
    }

    console.log(`deleting folder ${folder} and ${folderFullDir}`);
    await del(folderFullDir);
    await del(extractedFullPath);
  }
});
