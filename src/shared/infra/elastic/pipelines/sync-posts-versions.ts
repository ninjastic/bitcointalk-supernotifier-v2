/* eslint-disable no-await-in-loop */
import { Connection, MoreThan } from 'typeorm';
import { Client } from '@elastic/elasticsearch';
import RedisProvider from '##/shared/container/providers/implementations/RedisProvider';
import baseLogger from '##/shared/services/logger';
import PostVersion from '##/modules/posts/infra/typeorm/entities/PostVersion';
import { isValidPostgresInt } from '##/shared/services/utils';
import { load } from 'cheerio';

interface QuoteContent {
  author: string;
  content: string;
  topic_id: number;
  post_id: number;
}

interface PostDocVersion {
  id: string;
  post_id: number;
  new_title: string;
  new_content: string;
  new_content_without_quotes: string;
  quotes: QuoteContent[];
  edit_date: Date;
  deleted: boolean;
  created_at: Date;
}

interface PostContent {
  content: string;
  content_without_quotes: string;
  quotes: QuoteContent[];
}

interface LastSyncState {
  lastUpdatedAt: string;
}

export class SyncPostsVersionsPipeline {
  private readonly logger = baseLogger.child({ pipeline: 'syncPostsVersionsPipeline' });

  private readonly POSTS_INDEX_NAME = 'posts_v2';

  private readonly SYNC_BATCH_SIZE = 30000;

  private readonly INDEX_BATCH_SIZE = 10;

  constructor(
    private readonly connection: Connection,
    private readonly esClient: Client,
    private readonly cacheRepository: RedisProvider
  ) {}

  public async execute(): Promise<void> {
    try {
      await this.syncVersions();
    } catch (error) {
      this.logger.error({ error }, 'Error during synchronization');
    }
  }

  private extractPostContent(html: string | null): PostContent {
    if (!html) return { content: null, content_without_quotes: null, quotes: [] };

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

  private async batchProcess(versions: PostVersion[]): Promise<void> {
    const versiosToUpdateMap = new Map<number, PostDocVersion[]>();

    for (const version of versions) {
      const { content_without_quotes, content, quotes } = this.extractPostContent(version.new_content);
      const newVersion: PostDocVersion = {
        id: version.id,
        post_id: version.post_id,
        new_title: version.new_title,
        new_content: content,
        new_content_without_quotes: content_without_quotes,
        quotes,
        edit_date: version.edit_date,
        deleted: version.deleted,
        created_at: version.created_at
      };
      versiosToUpdateMap.set(version.post_id, [...(versiosToUpdateMap.get(version.post_id) ?? []), newVersion]);
    }

    const updateChunks = [];

    for (const [postId, newVersions] of versiosToUpdateMap.entries()) {
      const updateOperationInfo = { update: { _index: this.POSTS_INDEX_NAME, _id: postId.toString() } };
      const updateOperationContent = {
        script: {
          source: `
            if (ctx._source.versions == null) { 
              ctx._source.versions = params.newVersions; 
            } else { 
              def existingVersionIds = new HashSet(ctx._source.versions.stream().map(m -> m.id).collect(Collectors.toList()));
              for (newVersion in params.newVersions) { 
                if (!existingVersionIds.contains(newVersion.id)) { 
                  ctx._source.versions.add(newVersion); 
                } 
              } 
            }

            if (ctx._source.versions.size() > 0) {
              ctx._source.versions.sort((a, b) -> a.created_at.compareTo(b.created_at));
              
              int versionCounter = 1;
              for (version in ctx._source.versions) {
                version.version_number = versionCounter;
                versionCounter += 1;
              }
              
              ctx._source.versions_count = ctx._source.versions.size();
            }
          `,
          lang: 'painless',
          params: {
            newVersions
          }
        }
      };

      if (updateChunks.length === 0) {
        updateChunks.push([updateOperationInfo, updateOperationContent]);
        continue;
      }

      if (updateChunks.at(-1).length === this.INDEX_BATCH_SIZE * 2) {
        updateChunks.push([updateOperationInfo, updateOperationContent]);
        continue;
      }

      updateChunks.at(-1).push(updateOperationInfo, updateOperationContent);
    }

    const updateBulkPromises = [];
    for (const chunk of updateChunks) {
      updateBulkPromises.push(this.esClient.bulk({ operations: chunk, refresh: false }));
    }

    const results = await Promise.all(updateBulkPromises);

    if (results.some(result => result.errors)) {
      const erroredItems = results
        .flatMap(result => result.items)
        .filter(item => item.index?.error || item.create?.error || item.update?.error || item.delete?.error)
        .map(item => ({
          id: item.index?._id,
          error: item.index?.error || item.create?.error || item.update?.error || item.delete?.error,
          status: item.index?.status
        }));

      this.logger.error({ errored: erroredItems }, 'Index errored');
      throw new Error('Index errored');
    }
  }

  private async syncVersions(): Promise<void> {
    const postsVersionsRepository = this.connection.getRepository(PostVersion);

    let { lastUpdatedAt } = (await this.cacheRepository.recover<LastSyncState>('posts-versions-sync-state')) ?? {
      lastUpdatedAt: new Date(0).toISOString()
    };

    let stop = false;

    while (!stop) {
      const postsVersions = await postsVersionsRepository.find({
        where: { updated_at: MoreThan(lastUpdatedAt) },
        relations: ['post'],
        order: {
          updated_at: 'ASC'
        },
        take: this.SYNC_BATCH_SIZE
      });

      if (postsVersions.length) {
        await this.batchProcess(postsVersions);
        lastUpdatedAt = postsVersions.at(-1).updated_at.toISOString();

        await this.cacheRepository.save('posts-versions-sync-state', { lastUpdatedAt });
        this.logger.info(`Processed ${postsVersions.length} versions records. Last updated_at: ${lastUpdatedAt}`);
      }

      if (postsVersions.length < this.SYNC_BATCH_SIZE) {
        this.logger.info('Synchronization is up to date');
        stop = true;
      }
    }
  }
}
