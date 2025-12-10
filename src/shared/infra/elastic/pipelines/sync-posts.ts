import type { Client } from '@elastic/elasticsearch';
import type RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import type { Connection, ObjectLiteral } from 'typeorm';

import baseLogger from '##/shared/services/logger';
import { isValidPostgresInt } from '##/shared/services/utils';
import { load } from 'cheerio';
import Post from 'modules/posts/infra/typeorm/entities/Post';

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
  urls: string[];
  image_urls: string[];
}

export class SyncPostsPipeline {
  private readonly logger = baseLogger.child({ pipeline: 'syncPostsPipeline' });

  private readonly INDEX_NAME = 'posts_v3';

  private readonly INDEX_TEMPLATE_NAME = 'posts_v3_template';

  private readonly SYNC_BATCH_SIZE = 10000;

  private readonly INDEX_BATCH_SIZE = 200;

  constructor(
    private readonly connection: Connection,
    private readonly esClient: Client,
    private readonly cacheRepository: RedisProvider,
  ) {}

  public async execute(
    bootstrap?: boolean,
    lastPostId?: number,
  ): Promise<{ lastUpdatedAt: string; lastPostId: number }> {
    try {
      await this.setupElasticsearchTemplate();
      await this.createOrUpdateIndex();
      return this.syncPosts(bootstrap, lastPostId);
    }
    catch (error) {
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
                filter: ['stop', 'asciifolding', 'apostrophe', 'lowercase'],
                char_filter: ['html_strip'],
              },
              url_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'url_tokenizer', 'asciifolding'],
              },
            },
            normalizer: {
              lowercase_normalizer: {
                type: 'custom',
                filter: ['lowercase'],
              },
            },
            filter: {
              apostrophe: {
                type: 'word_delimiter_graph',
                preserve_original: true,
                catenate_words: true,
                split_on_case_change: false,
                split_on_numerics: false,
              },
              url_tokenizer: {
                type: 'word_delimiter_graph',
                preserve_original: true,
                split_on_numerics: false,
                split_on_case_change: false,
                generate_word_parts: true,
                generate_number_parts: false,
              },
            },
          },
        },
        mappings: {
          properties: {
            post_id: { type: 'integer' },
            topic_id: { type: 'integer' },
            title: {
              type: 'text',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            author: {
              type: 'keyword',
              fields: {
                lowercase: {
                  type: 'keyword',
                  normalizer: 'lowercase_normalizer',
                },
              },
            },
            author_uid: { type: 'integer' },
            content: {
              type: 'text',
              analyzer: 'html_strip',
            },
            content_without_quotes: {
              type: 'text',
              analyzer: 'html_strip',
            },
            quotes: {
              type: 'nested',
              properties: {
                author: {
                  type: 'keyword',
                  fields: {
                    lowercase: {
                      type: 'keyword',
                      normalizer: 'lowercase_normalizer',
                    },
                  },
                },
                content: {
                  type: 'text',
                  analyzer: 'html_strip',
                },
                topic_id: { type: 'integer' },
                post_id: { type: 'integer' },
              },
            },
            date: { type: 'date' },
            board_id: { type: 'integer' },
            merits: {
              type: 'nested',
              properties: {
                id: {
                  type: 'keyword',
                },
                amount: {
                  type: 'integer',
                },
                sender: {
                  type: 'keyword',
                  fields: {
                    lowercase: {
                      type: 'keyword',
                      normalizer: 'lowercase_normalizer',
                    },
                  },
                },
                sender_uid: {
                  type: 'integer',
                },
                receiver: {
                  type: 'keyword',
                  fields: {
                    lowercase: {
                      type: 'keyword',
                      normalizer: 'lowercase_normalizer',
                    },
                  },
                },
                receiver_uid: {
                  type: 'integer',
                },
                date: {
                  type: 'date',
                },
              },
            },
            merits_sum: { type: 'integer' },
            versions_count: { type: 'integer' },
            versions: {
              type: 'nested',
              properties: {
                id: { type: 'keyword' },
                version_number: { type: 'integer' },
                post_id: { type: 'integer' },
                new_title: {
                  type: 'text',
                  fields: {
                    keyword: { type: 'keyword' },
                  },
                },
                new_content: {
                  type: 'text',
                  analyzer: 'html_strip',
                },
                new_content_without_quotes: {
                  type: 'text',
                  analyzer: 'html_strip',
                },
                quotes: {
                  type: 'nested',
                  properties: {
                    author: {
                      type: 'keyword',
                      fields: {
                        lowercase: {
                          type: 'keyword',
                          normalizer: 'lowercase_normalizer',
                        },
                      },
                    },
                    content: {
                      type: 'text',
                      analyzer: 'html_strip',
                    },
                    topic_id: { type: 'integer' },
                    post_id: { type: 'integer' },
                  },
                },
                edit_date: { type: 'date' },
                deleted: { type: 'boolean' },
                urls: {
                  type: 'text',
                  analyzer: 'url_analyzer',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256,
                    },
                  },
                },
                image_urls: {
                  type: 'text',
                  analyzer: 'url_analyzer',
                  fields: {
                    keyword: { type: 'keyword', ignore_above: 256 },
                  },
                },
                created_at: { type: 'date' },
              },
            },
            urls: {
              type: 'text',
              analyzer: 'url_analyzer',
              fields: {
                keyword: { type: 'keyword', ignore_above: 256 },
              },
            },
            image_urls: {
              type: 'text',
              analyzer: 'url_analyzer',
              fields: {
                keyword: { type: 'keyword', ignore_above: 256 },
              },
            },
            is_topic_starter: {
              type: 'boolean',
            },
            updated_at: { type: 'date' },
          },
        },
      });
      this.logger.debug(`Elasticsearch template '${this.INDEX_TEMPLATE_NAME}' created or updated successfully.`);
    }
    catch (error) {
      this.logger.error({ error }, 'Error creating Elasticsearch template');
      throw error;
    }
  }

  private async createOrUpdateIndex(): Promise<void> {
    try {
      const indexExists = await this.esClient.indices.exists({ index: this.INDEX_NAME });

      if (!indexExists.valueOf()) {
        await this.esClient.indices.create({
          index: this.INDEX_NAME,
        });
        this.logger.debug(`Index '${this.INDEX_NAME}' created successfully.`);
      }
      else {
        this.logger.debug(`Index '${this.INDEX_NAME}' already exists.`);
      }
    }
    catch (error) {
      this.logger.error({ error }, 'Error creating or checking index');
      throw error;
    }
  }

  private extractPostContent(html: string): PostContent {
    const $ = load(html);
    const quotes: QuoteContent[] = [];
    let contentWithoutQuotes = $('body').html();

    $('div.quoteheader').each((_, quoteHeaderElement) => {
      const quoteHeader = $(quoteHeaderElement);
      const quoteDiv = quoteHeader.next('div.quote');

      const isRegularQuote = quoteHeader.children('a:not(.ul)').length === 0;
      if (isRegularQuote)
        return;

      const authorMatch = quoteHeader.text().match(/Quote from: (.*?) on/);
      if (!authorMatch)
        return;

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
      if (!postUrl)
        return;

      const url = new URL(postUrl);
      const topicParam = url.searchParams.get('topic');
      const hashPart = url.hash;

      if (!topicParam || !hashPart)
        return;

      let topicId = Number(topicParam.split('.')[0]);
      let postId = Number(hashPart.split('msg')[1]);

      if (!isValidPostgresInt(postId)) {
        postId = null;
      }

      if (!isValidPostgresInt(topicId)) {
        topicId = null;
      }

      quotes.push({
        content: quoteText.trim(),
        author,
        topic_id: topicId,
        post_id: postId,
      });

      contentWithoutQuotes = contentWithoutQuotes.replace(fullQuoteHtml, '');
    });

    const content = $('body').html();

    const urls = new Set<string>();
    const imageUrls = new Set<string>();

    $('img.userimg').each((_, imgElement) => {
      const img = $(imgElement);
      let src = img.attr('src');
      if (src) {
        if (src.startsWith('https://bitcointalk.org/Smileys/')) {
          return;
        }

        if (src.startsWith('https://ip.bitcointalk.org/')) {
          const urlObj = new URL(src);
          const imageUrl = urlObj.searchParams.get('u');

          if (imageUrl) {
            src = imageUrl;
          }

          try {
            src = imageUrl ? decodeURIComponent(imageUrl) : src;
          }
          catch (error) {
            this.logger.warn({ src }, '[SyncPosts] Invalid decodeURIComponent image url');
          }
        }

        if (src.length >= 256) {
          return;
        }

        imageUrls.add(src);
      }
    });

    $('a.ul').each((_, aElement) => {
      const a = $(aElement);
      const href = a.attr('href');
      if (href) {
        if (href.length >= 256) {
          return;
        }

        urls.add(href);
      }
    });

    return {
      content,
      content_without_quotes: contentWithoutQuotes,
      quotes,
      urls: Array.from(urls),
      image_urls: Array.from(imageUrls),
    };
  }

  private async batchProcessPost(posts: Post[]): Promise<void> {
    const chunks = [];

    for (const post of posts) {
      const { content_without_quotes, content, quotes, urls, image_urls } = this.extractPostContent(post.content);

      const operationInfo = {
        update: {
          _index: this.INDEX_NAME,
          _id: post.post_id.toString(),
        },
      };

      const operationContent = {
        doc: {
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
          urls,
          image_urls,
          updated_at: new Date(post.updated_at).toISOString(),
        },
        doc_as_upsert: true,
      };

      if (chunks.length === 0) {
        chunks.push([operationInfo, operationContent]);
        continue;
      }

      if (chunks.at(-1).length === this.INDEX_BATCH_SIZE * 2) {
        chunks.push([operationInfo, operationContent]);
        continue;
      }

      chunks.at(-1).push(operationInfo, operationContent);
    }

    const bulkPromises = [];

    for (const chunk of chunks) {
      bulkPromises.push(this.esClient.bulk({ operations: chunk, refresh: false }));
    }

    const results = await Promise.all(bulkPromises);

    if (results.some(result => result.errors)) {
      const erroredItems = results
        .flatMap(result => result.items)
        .filter(item => item.update?.error)
        .map(item => ({
          id: item.update?._id,
          error: item.update?.error,
          status: item.update?.status,
        }));

      this.logger.error({ errored: erroredItems }, 'Update errored');
      throw new Error('Update errored');
    }
  }

  private async getPostsToSync(type: 'updated_at' | 'post_id', last: string | number): Promise<any[]> {
    const postRepository = this.connection.getRepository(Post);

    let where: [string, ObjectLiteral] = ['', {}];
    let orderBy: [string, 'ASC' | 'DESC'] = ['', 'ASC'];

    if (type === 'updated_at') {
      where = ['posts.updated_at > :lastUpdatedAt', { lastUpdatedAt: last }];
      orderBy = ['posts.updated_at', 'ASC'];
    }
    else if (type === 'post_id') {
      where = ['posts.post_id > :lastPostId', { lastPostId: last }];
      orderBy = ['posts.post_id', 'ASC'];
    }

    const posts = await postRepository
      .createQueryBuilder('posts')
      .select(['*', 'posts.updated_at::text'])
      .where(where[0], where[1])
      .orderBy(orderBy[0], orderBy[1])
      .limit(this.SYNC_BATCH_SIZE)
      .getRawMany();

    return posts;
  }

  private async syncPosts(
    bootstrap?: boolean,
    bootstrapLastPostId?: number,
  ): Promise<{ lastUpdatedAt: string; lastPostId: number }> {
    let lastUpdatedAt: string;
    let lastPostId: number;

    if (bootstrap) {
      lastUpdatedAt = new Date(0).toISOString();
      lastPostId = bootstrapLastPostId;
    }
    else {
      ({ lastUpdatedAt, lastPostId } = (await this.cacheRepository.recover<LastSyncState>('syncState:posts')) ?? {
        lastUpdatedAt: new Date(0).toISOString(),
        lastPostId: 0,
      });
    }

    const lastSync = bootstrap
      ? {
          type: 'post_id' as 'post_id' | 'updated_at',
          last: lastPostId,
        }
      : {
          type: 'updated_at' as 'post_id' | 'updated_at',
          last: lastUpdatedAt,
        };

    let stop = false;
    let lastState = { lastUpdatedAt, lastPostId };

    while (!stop) {
      const posts = await this.getPostsToSync(lastSync.type, lastSync.last);

      if (posts.length) {
        await this.batchProcessPost(posts);
        lastUpdatedAt = posts.at(-1).updated_at;
        lastPostId = posts.at(-1).post_id;

        if (lastSync.type === 'updated_at') {
          lastSync.last = lastUpdatedAt;
        }
        else if (lastSync.type === 'post_id') {
          lastSync.last = lastPostId;
        }

        if (!bootstrap) {
          await this.cacheRepository.save('syncState:posts', { lastUpdatedAt, lastPostId });
        }

        this.logger.debug(
          `Processed ${posts.length} posts. Last updated_at: ${lastUpdatedAt} | Last post_id: ${lastPostId}`,
        );
      }

      if (posts.length < this.SYNC_BATCH_SIZE) {
        lastState = { lastUpdatedAt, lastPostId };

        this.logger.debug('Synchronization is up to date');
        stop = true;
      }
    }

    return lastState;
  }
}
