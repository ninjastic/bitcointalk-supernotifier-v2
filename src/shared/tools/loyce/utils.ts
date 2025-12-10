/* eslint-disable regexp/no-misleading-capturing-group */
/* eslint-disable regexp/no-super-linear-backtracking */
import axios from 'axios';
import { load } from 'cheerio';
import { sub } from 'date-fns';
import iconv from 'iconv-lite';

import type CreatePostDTO from '../../../modules/posts/dtos/CreatePostDTO';

function getLoyceArchiveUrl(id: number): string {
  const folder = String(id).slice(0, 4);
  return `https://loyce.club/archive/posts/${folder}/${id}.html`;
}

export async function scrapeLoyceArchivePost(postId: number): Promise<CreatePostDTO | null> {
  const url = getLoyceArchiveUrl(postId);
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    responseEncoding: 'binary',
    validateStatus: status => (status >= 200 && status < 300) || status === 404,
  });

  if (response.status === 404) {
    return null;
  }

  const decodedResponse = iconv.decode(response.data, 'WINDOWS-1252');
  const $ = load(decodedResponse, { decodeEntities: true });

  const post_id = Number($('body > b > a:nth-child(1)').text());
  const post_url = $('body > b > a:nth-child(1)').attr('href');
  const topic_id = Number(post_url.match(/topic=(\d+)\./i)[1]);
  const author = $('body > b > a:nth-child(2)').text();

  if (!author)
    return null;

  const author_url = $('body > b > a:nth-child(2)').attr('href');
  const author_uid = Number(author_url.match(/u=(\d+)/i)[1]);
  const dateRaw = $('body')
    .html()
    .match(/scraped on (.*)\):/i)[1];
  const dateFull = dateRaw.match(/\w{3}\s+(\w{3})\s+(\d+) .* \w+\s+(\d+)/);
  const date = `${dateFull[1]} ${dateFull[2]} ${dateFull[3]}`;
  const hourFull = dateRaw.match(/\w{3}\s+\w{3}\s+\d+\s+(.*)\s+\w+\s+\d+/);
  const hour = hourFull[1];
  const dateHour = `${date} ${hour}`;
  const dateFixed = new Date(dateHour);
  const dateFixedUtc = sub(dateFixed, { hours: 2 });
  const content = $('div.post').html();
  const title = '(Unknown Title)';

  if (!author_uid || !content || (content && !content.trim()) || !post_id) {
    return null;
  }

  if (author_uid && author_uid >= 999999999)
    return null;

  const post = {
    post_id,
    topic_id,
    title,
    author,
    author_uid,
    content,
    date: dateFixedUtc,
    boards: [],
    checked: false,
    notified: false,
    notified_to: [],
    archive: true,
  };

  return post;
}
