import { filterMentionContent } from './filter-mention-content';

describe('filterMentionContent', () => {
  test('removes quotes and preserves user images for direct mentions', () => {
    const content = filterMentionContent(
      '<div class="quoteheader">Quote from: Bob on today</div><div class="quote">old text</div><p>Hello <img class="userimg" /> world</p>',
      'Alice',
      'direct_mention',
    );

    expect(content).toBe('Hello [IMAGE] world');
  });

  test('treats usernames with regular expression characters as literal text', () => {
    const content = filterMentionContent(
      '<div class="quoteheader"><a>Quote from: a.b on today</a></div><div class="quote">quoted text</div><p>reply</p>',
      'a.b',
      'quoted_mention',
    );

    expect(content).toBe('reply');
  });
});
