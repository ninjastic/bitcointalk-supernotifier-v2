import ParsePostAddressesService from '../src/modules/posts/services/ParsePostAddressesService';
import Post from '../src/modules/posts/infra/typeorm/entities/Post';

test('should match non-quoted valid tron address', () => {
  const parseAddresses = new ParsePostAddressesService();

  const post: Post = {
    id: 'abc-123-xyz-456',
    post_id: 1337,
    topic_id: 25,
    author: 'satoshi',
    author_uid: 3,
    title: 'Re: I like pinnaple pizza',
    content: `
      <div class="quoteheader">
      <a href="https://bitcointalk.org/index.php?topic=25.msg1336#msg1336">Quote from: joker_josue on <b>Today</b> at 10:26:56 PM</a>
      </div>
      <div class="quote">
      (...)
      <br>
      I hope you like pizza, is this your address? TYh5oEYa8hJhXtbkpqXDpfSYUg7udNJ8DY
      <br>
      </div>
      I do! This is my address: TLebMqshfWp6KncpLQzQMsL3QXf6omSz6G
      `,
    date: new Date('2023-03-30T22:34:12.000Z'),
    board_id: 71,
    archive: false,
    created_at: new Date('2023-03-30T22:34:17.356392Z'),
    updated_at: new Date('2023-03-30T22:34:20.354083Z'),
    boards: [],
    checked: false,
    notified: false,
    notified_to: []
  };

  const addresses = parseAddresses.execute(post);

  expect(addresses).toEqual([
    {
      post_id: 1337,
      coin: 'TRX',
      address: 'TLebMqshfWp6KncpLQzQMsL3QXf6omSz6G'
    }
  ]);
});

test('should not match invalid tron address', () => {
  const parseAddresses = new ParsePostAddressesService();

  const post: Post = {
    id: 'abc-123-xyz-456',
    post_id: 1337,
    topic_id: 25,
    author: 'satoshi',
    author_uid: 3,
    title: 'Re: I like pinnaple pizza',
    content: `
      <div class="quoteheader">
      <a href="https://bitcointalk.org/index.php?topic=25.msg1336#msg1336">Quote from: joker_josue on <b>Today</b> at 10:26:56 PM</a>
      </div>
      <div class="quote">
      (...)
      <br>
      I hope you like pizza, is this your address? TYh5oEYa8hJhXtbkpqXDpfSYUg7udNJ8DY
      <br>
      </div>
      I do! This is my address: TLebMqshfWp6KncpLQzQMsL3QXf6omSz6Z
      Also check this https://spreadsheets.google.com/spreadsheet/ccc?key=0Ah_cSnFX-TLebMqshfWp6KncpLQzQMsL3QXf6omSz6Z
      `,
    date: new Date('2023-03-30T22:34:12.000Z'),
    board_id: 71,
    archive: false,
    created_at: new Date('2023-03-30T22:34:17.356392Z'),
    updated_at: new Date('2023-03-30T22:34:20.354083Z'),
    boards: [],
    checked: false,
    notified: false,
    notified_to: []
  };

  const addresses = parseAddresses.execute(post);

  expect(addresses).toEqual([]);
});
