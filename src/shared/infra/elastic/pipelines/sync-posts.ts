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
            fields: {
              stripped: {
                type: 'text',
                analyzer: 'html_strip'
              }
            }
          },
          content_without_quotes: {
            type: 'text',
            fields: {
              stripped: {
                type: 'text',
                analyzer: 'html_strip'
              }
            }
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
                fields: {
                  stripped: {
                    type: 'text',
                    analyzer: 'html_strip'
                  }
                }
              },
              topic_id: { type: 'integer' },
              post_id: { type: 'integer' }
            }
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
  const quotes: QuoteContent[] = [];
  let contentWithoutQuotes = html;

  $('div.quoteheader').each((_, quoteHeaderElement) => {
    const quoteHeader = $(quoteHeaderElement);
    const quoteDiv = quoteHeader.next('div.quote');

    const isRegularQuote = quoteHeader.children('a:not(.ul)').length === 0;
    if (isRegularQuote) return;

    const authorMatch = quoteHeader.text().match(/Quote from: (.*?) on/);
    if (!authorMatch) return;

    const author = authorMatch[1];

    const quoteText = quoteDiv
      .clone()
      .children('br')
      .each((_i, el) => {
        $(el).replaceWith(' ');
      })
      .end()
      .children('.quoteheader')
      .each((_i, el) => {
        if ($(el).children('a:not(.ul)').length > 0) {
          $(el.next).remove();
        }
        $(el).remove();
      })
      .end()
      .html()
      .trim();

    const fullQuoteHtml = quoteHeader.prop('outerHTML') + quoteDiv.prop('outerHTML');

    const postUrl = quoteHeader.find('a').attr('href');
    if (!postUrl) return;

    const url = new URL(postUrl);
    const topicParam = url.searchParams.get('topic');
    const hashPart = url.hash;

    if (!topicParam || !hashPart) return;

    const topicId = Number(topicParam.split('.')[0]);
    const postId = Number(hashPart.split('msg')[1]);

    quotes.push({
      content: quoteText.trim(),
      author,
      topic_id: topicId,
      post_id: postId
    });

    contentWithoutQuotes = contentWithoutQuotes.replace(fullQuoteHtml, '');
  });

  return {
    content: html,
    content_without_quotes: contentWithoutQuotes,
    quotes
  };
}

async function batchProcessPost(posts: Post[]) {
  const esBulkContent = posts.flatMap(post => {
    const { content_without_quotes, content, quotes } = extractPostContent(post.content);

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
        updated_at: new Date(post.updated_at).toISOString()
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

  let stop = false;

  while (!stop) {
    const posts = await postRepository
      .createQueryBuilder('post')
      .select(['*', 'post.updated_at::text'])
      .where('post.updated_at > :lastUpdatedAt', {
        lastUpdatedAt
      })
      .orderBy('post.updated_at', 'ASC')
      .limit(SYNC_BATCH_SIZE)
      .getRawMany();

    if (posts.length) {
      await batchProcessPost(posts);
      lastUpdatedAt = posts.at(-1).updated_at;
      lastPostId = posts.at(-1).post_id;

      await cacheRepository.save('posts-sync-state', { lastUpdatedAt, lastPostId });
      logger.info(`Processed ${posts.length} posts. Last updated_at: ${lastUpdatedAt} | Last post_id: ${lastPostId}`);
    }

    if (posts.length < SYNC_BATCH_SIZE) {
      logger.info('Synchronization is up to date');
      stop = true;
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
