import 'reflect-metadata';
import 'dotenv/config';
import fs from 'fs-extra';
import { Connection, createConnection } from 'typeorm';
import Post from 'modules/posts/infra/typeorm/entities/Post';
import esClient from 'shared/services/elastic';
import 'shared/container';
import { load } from 'cheerio';

const INDEX_NAME = 'posts_v2';
const INDEX_TEMPLATE_NAME = 'posts_v2_template';
const SYNC_STATE_FILE = 'sync_state.json';
const SYNC_BATCH_SIZE = 50000;
const SYNC_INTERVAL = 5 * 60 * 1000;
const INDEX_BATCHES = 10;

async function setupElasticsearchTemplate() {
  try {
    await esClient.indices.putTemplate({
      name: INDEX_TEMPLATE_NAME,
      index_patterns: [INDEX_NAME],
      settings: {
        analysis: {
          analyzer: {
            html_strip: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'stop'],
              char_filter: ['html_strip']
            }
          },
          normalizer: {
            keyword_lowercase: {
              type: 'custom',
              filter: ['lowercase']
            }
          }
        }
      },
      mappings: {
        properties: {
          post_id: { type: 'long' },
          topic_id: { type: 'long' },
          title: {
            type: 'text',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          author: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                normalizer: 'keyword_lowercase'
              }
            }
          },
          author_uid: { type: 'long' },
          raw_content: {
            type: 'text',
            analyzer: 'html_strip'
          },
          content: {
            type: 'text',
            analyzer: 'html_strip'
          },
          quotes: {
            type: 'text',
            analyzer: 'html_strip'
          },
          quoted_users: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                normalizer: 'keyword_lowercase'
              }
            }
          },
          date: { type: 'date' },
          board_id: { type: 'long' },
          updated_at: { type: 'date' }
        }
      }
    });
    console.log(`Elasticsearch template '${INDEX_TEMPLATE_NAME}' created or updated successfully.`);
  } catch (error) {
    console.error('Error creating Elasticsearch template:', error);
    throw error;
  }
}

async function createOrUpdateIndex() {
  try {
    const indexExists = await esClient.indices.exists({ index: INDEX_NAME });

    if (!indexExists.valueOf()) {
      await esClient.indices.create({
        index: INDEX_NAME
      });
      console.log(`Index '${INDEX_NAME}' created successfully.`);
    } else {
      console.log(`Index '${INDEX_NAME}' already exists.`);
    }
  } catch (error) {
    console.error('Error creating or checking index:', error);
    throw error;
  }
}

interface LastSyncState {
  lastUpdatedAt: string;
  lastPostId: number;
}

async function getLastSyncState(): Promise<LastSyncState> {
  try {
    const data = await fs.readFile(SYNC_STATE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Error reading sync state file:', error);
    }
  }
  return { lastUpdatedAt: new Date(0).toISOString(), lastPostId: 0 };
}

async function saveLastSyncState(state: LastSyncState): Promise<void> {
  await fs.writeFile(SYNC_STATE_FILE, JSON.stringify(state), 'utf8');
}

type PostContent = {
  raw_content: string;
  content: string;
  quoted_users: string[];
  quotes: string[];
};

function extractPostContent(html: string): PostContent {
  const $ = load(html);

  const result: PostContent = {
    raw_content: html,
    content: '',
    quoted_users: [],
    quotes: []
  };

  function extractTextContent(element: cheerio.Cheerio): string {
    return element
      .clone()
      .children('br')
      .each((_, el) => {
        $(el).replaceWith(' ');
      })
      .end()
      .children('.quoteheader')
      .each((_, el) => {
        if ($(el).children('a').length > 0) {
          $(el.next).remove();
        }
        $(el).text(' ');
      })
      .end()
      .text()
      .trim();
  }

  function processQuote(element: cheerio.Cheerio) {
    const quoteHeader = element.prev('.quoteheader');
    if (quoteHeader.length) {
      const userMatch = quoteHeader.text().match(/Quote from: (.+?) on/);
      if (userMatch) {
        result.quoted_users.push(userMatch[1]);
      }
    }

    const quoteContent = extractTextContent(element);
    if (quoteContent) {
      result.quotes.push(quoteContent);
    }

    element.find('> .quote').each((_, nestedQuote) => {
      processQuote($(nestedQuote));
    });
  }

  $('.quote').each((_, quote) => {
    if ($(quote).parent().hasClass('quote') || $(quote).prev('.quoteheader').children('a').length === 0) return;
    processQuote($(quote));
  });

  result.content = extractTextContent($('body'));

  $('.quoteheader').each((_, element) => {
    if ($(element).children('a').length > 0) {
      const elementText = $(element.next).text();
      result.content = result.content.replace(elementText, '');
    }
  });

  result.content = result.content.trim();
  result.quoted_users = [...new Set(result.quoted_users)];

  return result;
}

async function batchProcessPost(posts: Post[]) {
  const esBulkContent = posts.flatMap(post => {
    const { raw_content, content, quoted_users, quotes } = extractPostContent(post.content);

    return [
      { index: { _index: INDEX_NAME, _id: post.post_id.toString() } },
      {
        post_id: post.post_id,
        topic_id: post.topic_id,
        title: post.title,
        author: post.author,
        author_uid: post.author_uid,
        raw_content,
        content,
        quoted_users,
        quotes,
        date: post.date,
        board_id: post.board_id,
        updated_at: post.updated_at
      }
    ];
  });

  const batchSize = Math.ceil(esBulkContent.length / 2 / INDEX_BATCHES);

  const bulkPromises = [];
  for (let i = 0; i < esBulkContent.length; i += batchSize * 2) {
    bulkPromises.push(esClient.bulk({ operations: esBulkContent.slice(i, i + batchSize * 2), refresh: false }));
  }

  await Promise.all(bulkPromises);
}

async function syncPosts(connection: Connection) {
  const postRepository = connection.getRepository(Post);
  let { lastUpdatedAt, lastPostId } = await getLastSyncState();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.time('SyncBatch');
    // eslint-disable-next-line no-await-in-loop
    const posts = await postRepository
      .createQueryBuilder('post')
      .where('post.updated_at > :lastUpdatedAt', {
        lastUpdatedAt
      })
      .orderBy('post.updated_at', 'ASC')
      .limit(SYNC_BATCH_SIZE)
      .getMany();

    // eslint-disable-next-line no-await-in-loop
    await batchProcessPost(posts);
    lastUpdatedAt = posts.at(-1).updated_at.toISOString();
    lastPostId = posts.at(-1).post_id;

    // eslint-disable-next-line no-await-in-loop
    await saveLastSyncState({ lastUpdatedAt, lastPostId });
    console.log(`Processed ${posts.length} posts. Last updated_at: ${lastUpdatedAt} | Last post_id: ${lastPostId}`);
    console.timeEnd('SyncBatch');

    if (posts.length < SYNC_BATCH_SIZE) {
      console.log('Synchronization is up to date. Waiting...');
      // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
      await new Promise(resolve => setTimeout(resolve, SYNC_INTERVAL));
    }
  }
}

async function main() {
  let connection: Connection | undefined;

  try {
    await setupElasticsearchTemplate();
    await createOrUpdateIndex();

    connection = await createConnection();
    await syncPosts(connection);
  } catch (error) {
    console.error('Error during synchronization:', error);
  } finally {
    if (connection) await connection.close();
    await esClient.close();
  }
}

main();
