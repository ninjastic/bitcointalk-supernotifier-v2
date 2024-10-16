import axios from 'axios';
import { load } from 'cheerio';
import fs from 'fs';
import path from 'path';

const USER_ID = process.argv[2];
const PAGE_URL = `https://bitcointalk.org/index.php?action=profile;u=${USER_ID};sa=showPosts`;

if (!USER_ID) {
  console.error('Missing USER ID.');
  process.exit(1);
}

const sleep = ms =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

const getUserPostsPageCount = async () => {
  const response = await axios.get(PAGE_URL);
  const html = response.data;
  const $ = load(html);

  const lastPageElement = $(
    '#bodyarea > table > tbody > tr > td > table:nth-child(1) .navPages:not(span > .navPages):last-of-type'
  );
  const lastPageNumber = Number(lastPageElement.text());
  return lastPageNumber;
};

const fetchUserPostsPage = async (page = 1) => {
  const start = Math.max(page - 1, 0) * 20;
  console.log('Page', page, 'Start', start);
  const response = await axios.get(`${PAGE_URL};start=${start}`);
  const html = response.data;
  const $ = load(html);

  const postTables = $('#bodyarea td[width="100%"] table.bordercolor[width="85%"]').slice(1, -1);

  const postIds = [...postTables].map(element => {
    const postUrl = $(element).find('tbody > tr > td > table:nth-child(1) a:nth-child(3)').attr('href');
    const postId = Number(postUrl.match(/#msg(\d+)/).at(1));
    return postId;
  });

  return postIds;
};

const saveIdsToJson = (ids: number[]) => {
  const jsonString = JSON.stringify(ids, null, 2);
  const filePath = path.join(process.cwd(), `user-posts.${USER_ID}.json`);
  fs.writeFileSync(filePath, jsonString, 'utf-8');
};

const run = async () => {
  const pages = await getUserPostsPageCount();
  console.log('Pages', pages);

  const ids = [];
  for (let page = 1; page <= pages; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const posts = await fetchUserPostsPage(page);

    ids.push(...posts);
    console.log('Posts so far:', ids.length);
    // eslint-disable-next-line no-await-in-loop
    await sleep(1000);
  }

  saveIdsToJson(ids);
};

run();
