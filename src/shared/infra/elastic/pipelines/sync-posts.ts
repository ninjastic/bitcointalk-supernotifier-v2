/* eslint-disable no-await-in-loop */
import { Connection } from 'typeorm';
import { Client } from '@elastic/elasticsearch';
import Post from 'modules/posts/infra/typeorm/entities/Post';
import { load } from 'cheerio';
import RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import baseLogger from '##/shared/services/logger';

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

export class SyncPostsPipeline {
  private readonly logger = baseLogger.child({ pipeline: 'syncPostsPipeline' });

  private readonly INDEX_NAME = 'posts';

  private readonly INDEX_TEMPLATE_NAME = 'posts_template';

  private readonly SYNC_BATCH_SIZE = 30000;

  private readonly INDEX_BATCH_SIZE = 10;

  constructor(
    private readonly connection: Connection,
    private readonly esClient: Client,
    private readonly cacheRepository: RedisProvider
  ) {}

  public async execute(): Promise<void> {
    try {
      await this.setupElasticsearchTemplate();
      await this.createOrUpdateIndex();
      await this.syncPosts();
    } catch (error) {
      this.logger.error({ error }, 'Error during synchronization');
    }
  }

  private async setupElasticsearchTemplate(): Promise<void> {
    try {
      await this.esClient.indices.putTemplate({
        name: this.INDEX_TEMPLATE_NAME,
        index_patterns: [this.INDEX_NAME],
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
            merit_ids: {
              type: 'keyword'
            },
            updated_at: { type: 'date' }
          }
        }
      });
      this.logger.info(`Elasticsearch template '${this.INDEX_TEMPLATE_NAME}' created or updated successfully.`);
    } catch (error) {
      this.logger.error({ error }, 'Error creating Elasticsearch template');
      throw error;
    }
  }

  private async createOrUpdateIndex(): Promise<void> {
    try {
      const indexExists = await this.esClient.indices.exists({ index: this.INDEX_NAME });

      if (!indexExists.valueOf()) {
        await this.esClient.indices.create({
          index: this.INDEX_NAME
        });
        this.logger.info(`Index '${this.INDEX_NAME}' created successfully.`);
      } else {
        this.logger.info(`Index '${this.INDEX_NAME}' already exists.`);
      }
    } catch (error) {
      this.logger.error({ error }, 'Error creating or checking index');
      throw error;
    }
  }

  private extractPostContent(html: string): PostContent {
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

  private async batchProcessPost(posts: Post[]): Promise<void> {
    const esBulkContent = posts.flatMap(post => {
      const { content_without_quotes, content, quotes } = this.extractPostContent(post.content);

      return [
        { index: { _index: this.INDEX_NAME, _id: post.post_id.toString() } },
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

    const batchSize = Math.ceil(esBulkContent.length / 2 / this.INDEX_BATCH_SIZE);

    const bulkPromises = [];
    for (let i = 0; i < esBulkContent.length; i += batchSize * 2) {
      bulkPromises.push(this.esClient.bulk({ operations: esBulkContent.slice(i, i + batchSize * 2), refresh: false }));
    }

    const results = await Promise.all(bulkPromises);
    if (results.some(result => result.errors)) {
      const erroredItems = results
        .flatMap(result => result.items)
        .filter(item => item.index.error || item.create?.error || item.update?.error || item.delete?.error)
        .map(item => ({
          id: item.index._id,
          error: item.index.error || item.create?.error || item.update?.error || item.delete?.error,
          status: item.index.status
        }));

      this.logger.error({ errored: erroredItems }, 'Index errored');
      throw new Error('Index errored');
    }
  }

  private async syncPosts(): Promise<void> {
    const postRepository = this.connection.getRepository(Post);

    let { lastUpdatedAt, lastPostId } = (await this.cacheRepository.recover<LastSyncState>('posts-sync-state')) ?? {
      lastUpdatedAt: new Date(0).toISOString(),
      lastPostId: 0
    };

    let stop = false;

    while (!stop) {
      const posts = await postRepository
        .createQueryBuilder('posts')
        .select(['*', 'posts.updated_at::text'])
        .where('posts.updated_at > :lastUpdatedAt', {
          lastUpdatedAt
        })
        .orderBy('posts.updated_at', 'ASC')
        .limit(this.SYNC_BATCH_SIZE)
        .getRawMany();

      if (posts.length) {
        await this.batchProcessPost(posts);
        lastUpdatedAt = posts.at(-1).updated_at;
        lastPostId = posts.at(-1).post_id;

        await this.cacheRepository.save('posts-sync-state', { lastUpdatedAt, lastPostId });
        this.logger.info(
          `Processed ${posts.length} posts. Last updated_at: ${lastUpdatedAt} | Last post_id: ${lastPostId}`
        );
      }

      if (posts.length < this.SYNC_BATCH_SIZE) {
        this.logger.info('Synchronization is up to date');
        stop = true;
      }
    }
  }
}
