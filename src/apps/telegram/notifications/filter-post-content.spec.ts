import { filterPostContent } from './filter-post-content';

describe('filterPostContent', () => {
  test('removes quote blocks and normalizes whitespace', () => {
    expect(
      filterPostContent(
        '<div class="quoteheader">Quote from: Alice</div><div class="quote">old text</div><p>Hello<br />world</p>',
      ),
    ).toBe('Hello\u00a0world');
  });

  test('preserves non-quote content', () => {
    expect(filterPostContent('<p>First</p><p>Second</p>')).toBe('FirstSecond');
  });
});
