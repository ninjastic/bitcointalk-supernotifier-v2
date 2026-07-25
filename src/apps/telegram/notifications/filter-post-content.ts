import { load } from 'cheerio';

export function filterPostContent(content: string): string {
  const $ = load(content);
  const body = $('body');

  body.children('div.quote, div.quoteheader').remove();
  body.find('br').replaceWith('&nbsp;');

  return body
    .text()
    .replace(/\s{2,}/g, ' ')
    .trim();
}
