import 'reflect-metadata';
import 'dotenv/config';
import type { ParsedTopicPost } from '##/modules/posts/services/scraper/parse-topic-post-op-html';
import type { PostScraper } from '##/modules/posts/services/scraper/post-scraper';

import Topic from '##/modules/posts/infra/typeorm/entities/Topic';

import '../container';

import TopicMissing from '##/modules/posts/infra/typeorm/entities/TopicMissing';
import inquirer from 'inquirer';
import { container } from 'tsyringe';
import { createConnection } from 'typeorm';

import Post from '../../modules/posts/infra/typeorm/entities/Post';
import { scrapeLoyceArchivePost } from './loyce/utils';

interface PromptAnswers {
  startTopicId: number;
  endTopicId: number;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const BATCH_SIZE = 50;

async function retryScrapeTopicOp(
  postScraper: PostScraper,
  topicId: number,
  maxAttempts = 3,
  delayMs = 2000,
): Promise<ParsedTopicPost | null> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await postScraper.scrapeTopicOp(topicId);
    }
    catch (err) {
      lastError = err;
      console.warn(`scrapeTopicOp failed (attempt ${attempt}/${maxAttempts}): ${err.message}`);
      if (attempt < maxAttempts) {
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
  }
  console.error(`scrapeTopicOp failed after ${maxAttempts} attempts`, lastError);
  return null;
}

async function scrape() {
  const answers = await inquirer.prompt<PromptAnswers>([
    {
      name: 'startTopicId',
      type: 'number',
      message: 'Topic ID start?',
    },
    {
      name: 'endTopicId',
      type: 'number',
      message: 'Topic ID end?',
      validate: (value, { startTopicId }) => value >= startTopicId || 'Can not be lower than the start value',
    },
  ]);

  const connection = await createConnection();

  const query = `
    with
        all_ids as (
    select
      generate_series($1::int, $2::int) as id
        ),
        missing_ids as (
    select
      all_ids.id
    from
      all_ids
    left join topics on all_ids.id = topics.topic_id
    left join topics_missing on all_ids.id = topics_missing.id
    where
      topics.topic_id is null
      and topics_missing.id is null
        )
      select
      id
    from
      missing_ids
    order by
      id asc
  `;

  const missingIds: number[] = await connection.manager
    .query(query, [answers.startTopicId, answers.endTopicId])
    .then(results => results.map(row => row.id));

  console.log(`Range: [${answers.startTopicId}, ${answers.endTopicId}]`);
  console.log(`Found missing topic ids: ${missingIds.length}`);

  const postScraper = container.resolve<PostScraper>('PostScraper');

  for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
    const batch = missingIds.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(missingIds.length / BATCH_SIZE)}`);

    const postsToInsert: Post[] = [];
    const topicsToInsert: Topic[] = [];
    const idsNotFound = [];

    for await (const id of batch) {
      console.log(`Checking topic of id ${id}`);

      const result = await retryScrapeTopicOp(postScraper, id, 5, 2000);

      if (!result) {
        continue;
      }

      const { post: forumPost, topic } = result;

      if (forumPost && topic) {
        const loycePost = await scrapeLoyceArchivePost(forumPost.post_id).catch((err) => {
          console.log(`Loyce archive for post ${forumPost.post_id} request failed: ${err.message}`);
          return null;
        });
        const post: Post = { ...forumPost, content: loycePost?.content ?? forumPost.content };
        postsToInsert.push(post);
        topicsToInsert.push(topic);
        console.log(`Topic of id ${id} found!`);
        continue;
      }

      console.log(`Topic of id ${id} not found`);
      idsNotFound.push({ id, verified_at: new Date() });
    }

    console.log('postsToInsert length', postsToInsert.length);
    if (postsToInsert.length) {
      await connection.manager.createQueryBuilder().insert().into(Post).values(postsToInsert).orIgnore().execute();
    }

    console.log('topicsToInsert length', topicsToInsert.length);
    if (topicsToInsert.length) {
      await connection.manager.createQueryBuilder().insert().into(Topic).values(topicsToInsert).orIgnore().execute();
    }

    console.log('idsNotFound length', idsNotFound.length);
    if (idsNotFound.length) {
      await connection.manager
        .createQueryBuilder()
        .insert()
        .into(TopicMissing)
        .values(idsNotFound)
        .orIgnore()
        .execute();
    }

    await sleep(1000);
  }

  console.log(`Finished range [${answers.startTopicId}, ${answers.endTopicId}]`);
}

scrape().then(() => {
  process.exit(0);
});
