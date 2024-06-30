import 'reflect-metadata';
import 'dotenv/config.js';
import { container } from 'tsyringe';
import { createConnection } from 'typeorm';
import inquirer from 'inquirer';

import '../container';

import ScrapePostService from '../../modules/posts/services/ScrapePostService';
import CreatePostService from '../../modules/posts/services/CreatePostService';
import Post from '../../modules/posts/infra/typeorm/entities/Post';
import PostMissing from '../../modules/posts/infra/typeorm/entities/PostMissing';
import { scrapeLoyceArchivePost } from './loyce/utils';

type PromptAnswers = {
  startPostId: number;
  endPostId: number;
};

const sleep = ms =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

const BATCH_SIZE = 50;

const scrape = async () => {
  const answers = await inquirer.prompt<PromptAnswers>([
    {
      name: 'startPostId',
      type: 'number',
      message: 'Post ID start?'
    },
    {
      name: 'endPostId',
      type: 'number',
      message: 'Post ID end?',
      validate: (value, { startPostId }) => value > startPostId ?? 'Can not be lower than the start value'
    }
  ]);

  const connection = await createConnection();

  const query = `
    WITH
    all_ids AS (
      SELECT
        generate_series($1::int, $2::int) AS id
    ),
    missing_ids AS (
      SELECT
        all_ids.id
      FROM
        all_ids
        LEFT JOIN posts ON all_ids.id = posts.post_id
        LEFT JOIN posts_missing ON all_ids.id = posts_missing.id
      WHERE
        posts.post_id IS NULL
        AND posts_missing.id IS NULL
    )
  SELECT
    id
  FROM
    missing_ids
  ORDER BY
    id ASC
  `;

  const missingIds: number[] = await connection.manager
    .query(query, [answers.startPostId, answers.endPostId])
    .then(results => results.map(row => row.id));

  console.log(`Range: [${answers.startPostId}, ${answers.endPostId}]`);
  console.log(`Found missing ids: ${missingIds.length}`);

  const scrapePost = container.resolve(ScrapePostService);
  const createPost = container.resolve(CreatePostService);

  for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
    const batch = missingIds.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(missingIds.length / BATCH_SIZE)}`);

    const postsToInsert: Post[] = [];
    const idsNotFound = [];

    // eslint-disable-next-line no-await-in-loop
    for await (const id of batch) {
      console.log(`Checking post of id ${id}`);

      const forumPost = await scrapePost.execute({ post_id: id });
      const loycePost = await scrapeLoyceArchivePost(id);

      if (forumPost) {
        const post: Post = { ...forumPost, content: loycePost?.content ?? forumPost.content };
        postsToInsert.push(post);
        continue;
      }

      if (loycePost) {
        const post: Post = createPost.execute({ ...loycePost, archive: true });
        postsToInsert.push(post);
        continue;
      }

      idsNotFound.push({ id, verified_at: new Date() });
    }

    console.log('postsToInsert length', postsToInsert.length);

    if (postsToInsert.length) {
      // eslint-disable-next-line no-await-in-loop
      await connection.manager
        .createQueryBuilder()
        .insert()
        .into(Post)
        .values(postsToInsert)
        .onConflict('("post_id") DO NOTHING')
        .execute();
    }

    console.log('idsNotFound length', idsNotFound.length);

    if (idsNotFound.length) {
      // eslint-disable-next-line no-await-in-loop
      await connection.manager
        .createQueryBuilder()
        .insert()
        .into(PostMissing)
        .values(idsNotFound)
        .onConflict('("id") DO NOTHING')
        .execute();
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(1000);
  }
};

scrape();
