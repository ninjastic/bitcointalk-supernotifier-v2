/* eslint-disable no-await-in-loop */
import { Connection } from 'typeorm';
import Post from 'modules/posts/infra/typeorm/entities/Post';
import esClient from 'shared/services/elastic';
import { load } from 'cheerio';
import { container } from 'tsyringe';
import RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import baseLogger from '##/shared/services/logger';

const logger = baseLogger.child({ pipeline: 'syncPostsPipeline' });

const INDEX_NAME = 'posts';
const INDEX_TEMPLATE_NAME = 'posts_template';
const SYNC_BATCH_SIZE = 50000;
const SYNC_INTERVAL = 5 * 60 * 1000;
const INDEX_BATCH_SIZE = 10;

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
          post_id: { type: 'integer' },
          topic_id: { type: 'integer' },
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
          author_uid: { type: 'integer' },
          content: {
            type: 'text',
            analyzer: 'html_strip'
          },
          content_without_quotes: {
            type: 'text',
            analyzer: 'html_strip'
          },
          quotes: {
            type: 'nested',
            properties: {
              author: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              content: {
                type: 'text',
                analyzer: 'html_strip'
              }
            }
          },
          urls: {
            type: 'text',
            analyzer: 'standard'
          },
          date: { type: 'date' },
          board_id: { type: 'integer' },
          updated_at: { type: 'date' }
        }
      }
    });
    logger.info(`Elasticsearch template '${INDEX_TEMPLATE_NAME}' created or updated successfully.`);
  } catch (error) {
    logger.error({ error }, 'Error creating Elasticsearch template');
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
      logger.info(`Index '${INDEX_NAME}' created successfully.`);
    } else {
      logger.info(`Index '${INDEX_NAME}' already exists.`);
    }
  } catch (error) {
    logger.error({ error }, 'Error creating or checking index');
    throw error;
  }
}

interface LastSyncState {
  lastUpdatedAt: string;
  lastPostId: number;
}

interface QuoteContent {
  author: string;
  content: string;
  topic_id: number;
  post_id: number;
}

interface PostContent {
  content: string;
  content_without_quotes: string;
  quotes: QuoteContent[];
}

function extractPostContent(html: string): PostContent {
  const $ = load(html);

  const result: PostContent = {
    content: html,
    content_without_quotes: '',
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
    if (quoteHeader.length && quoteHeader.find('a').length) {
      const userMatch = quoteHeader.text().match(/Quote from: (.+?) on/);
      if (userMatch) {
        const author = userMatch[1];
        const quoteContent = extractTextContent(element);

        try {
          const quoteUrl = new URL(quoteHeader.find('a').attr('href') ?? '');
          const topicParam = quoteUrl.searchParams.get('topic');
          const hashPart = quoteUrl.hash;

          if (!topicParam || !hashPart) {
            return;
          }

          const topicId = Number(topicParam.split('.')[0]);
          const postId = Number(hashPart.split('msg')[1]);

          if (Number.isInteger(topicId) && Number.isInteger(postId) && topicId > 0 && postId > 0 && quoteContent) {
            result.quotes.push({
              author,
              content: quoteContent,
              topic_id: topicId,
              post_id: postId
            });
          }
        } catch (error) {
          logger.error({ error, quoteHeaderHtml: quoteHeader.find('a').html() }, 'Error processing quote');
        }
      }
    }

    element.find('> .quote').each((_, nestedQuote) => {
      processQuote($(nestedQuote));
    });
  }

  $('.quote').each((_, quote) => {
    if ($(quote).parent().hasClass('quote') || $(quote).prev('.quoteheader').children('a').length === 0) return;
    processQuote($(quote));
  });

  result.content_without_quotes = extractTextContent($('body'));

  $('.quoteheader').each((_, element) => {
    if ($(element).children('a').length > 0) {
      const elementText = $(element.next).text();
      result.content = result.content.replace(elementText, '');
    }
  });

  result.content_without_quotes = result.content_without_quotes.trim();

  return result;
}

async function batchProcessPost(posts: Post[]) {
  const esBulkContent = posts.flatMap(post => {
    const { content, content_without_quotes, quotes } = extractPostContent(post.content);

    return [
      { index: { _index: INDEX_NAME, _id: post.post_id.toString() } },
      {
        post_id: post.post_id,
        topic_id: post.topic_id,
        title: post.title,
        author: post.author,
        author_uid: post.author_uid,
        content,
        content_without_quotes,
        quotes,
        date: post.date,
        board_id: post.board_id,
        updated_at: post.updated_at
      }
    ];
  });

  const batchSize = Math.ceil(esBulkContent.length / 2 / INDEX_BATCH_SIZE);

  const bulkPromises = [];
  for (let i = 0; i < esBulkContent.length; i += batchSize * 2) {
    bulkPromises.push(esClient.bulk({ operations: esBulkContent.slice(i, i + batchSize * 2), refresh: false }));
  }

  await Promise.all(bulkPromises);
}

async function syncPosts(connection: Connection) {
  const cacheRepository = container.resolve(RedisProvider);
  const postRepository = connection.getRepository(Post);

  let { lastUpdatedAt, lastPostId } = (await cacheRepository.recover<LastSyncState>('posts-sync-state')) ?? {
    lastUpdatedAt: new Date(0).toISOString(),
    lastPostId: 0
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const posts = await postRepository
      .createQueryBuilder('post')
      .where('post.updated_at > :lastUpdatedAt', {
        lastUpdatedAt
      })
      .orderBy('post.updated_at', 'ASC')
      .limit(SYNC_BATCH_SIZE)
      .getMany();

    if (posts.length) {
      await batchProcessPost(posts);
      lastUpdatedAt = posts.at(-1).updated_at.toISOString();
      lastPostId = posts.at(-1).post_id;

      await cacheRepository.save('posts-sync-state', { lastUpdatedAt, lastPostId });
      logger.info(`Processed ${posts.length} posts. Last updated_at: ${lastUpdatedAt} | Last post_id: ${lastPostId}`);
    }

    if (posts.length < SYNC_BATCH_SIZE) {
      logger.info('Synchronization is up to date. Waiting...');
      // eslint-disable-next-line no-promise-executor-return
      await new Promise(resolve => setTimeout(resolve, SYNC_INTERVAL));
    }
  }
}

export async function syncPostsPipeline(connection: Connection) {
  try {
    await setupElasticsearchTemplate();
    await createOrUpdateIndex();

    await syncPosts(connection);
  } catch (error) {
    logger.error({ error }, 'Error during synchronization');
  } finally {
    if (connection) await connection.close();
    await esClient.close();
  }
}
