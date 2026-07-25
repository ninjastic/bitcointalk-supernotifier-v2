import type { MentionType } from '##/platform/queues/types/telegram';
import type { Element } from 'domhandler';

import { load } from 'cheerio';

function escapeRegex(text: string): string {
  return text.replace(/([.*+?^${}()|[\]\\<>])/g, '\\$1');
}

export function filterMentionContent(
  content: string,
  username: string | null,
  mentionType: MentionType,
): string {
  const $ = load(content);
  const body = $('body');
  const relevantQuotesElements: Element[] = [];

  body.find('img.userimg').each((_, element) => {
    $(element).replaceWith('[IMAGE]');
  });

  if (mentionType === 'quoted_mention' && username) {
    const quotes = body.find('div.quoteheader:has(a:not(.ul)):not(.quote *)').toArray();

    quotes.forEach((element) => {
      const quoteHeader = $(element);

      const isRegularQuote = quoteHeader.children('a:not(.ul)').length === 0;
      if (isRegularQuote) return;

      const authorMatch = quoteHeader
        .text()
        .match(new RegExp(`Quote from: ${escapeRegex(username)} on`, 'gi'));

      if (authorMatch) {
        relevantQuotesElements.push(element);
      }
    });

    const relevantTexts = [];

    for (const quote of relevantQuotesElements) {
      let currentNode = quote.next;
      while (currentNode) {
        currentNode = currentNode.next;
        if (!currentNode) break;
        if (quotes.some((quoteElement) => quoteElement === currentNode)) break;
        if ($(currentNode).hasClass('quoteheader')) continue;

        const nodeText = $(currentNode).text();
        if (nodeText) {
          relevantTexts.push(nodeText);
        }
      }
    }

    if (relevantTexts.length) {
      return relevantTexts.join(' ');
    }
  }

  body.children('div.quote, div.quoteheader').remove();
  body.find('br').replaceWith('&nbsp;');
  return body
    .text()
    .replace(/\s{2,}/g, ' ')
    .trim();
}
