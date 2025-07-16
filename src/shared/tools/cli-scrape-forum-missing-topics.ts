import 'reflect-metadata';
import 'dotenv/config';
import { container } from 'tsyringe';
import { createConnection } from 'typeorm';
import inquirer from 'inquirer';

import '../container';

import Post from '../../modules/posts/infra/typeorm/entities/Post';
import { scrapeLoyceArchivePost } from './loyce/utils';
import { PostScraper } from '##/modules/posts/services/scraper/post-scraper';
import Topic from '##/modules/posts/infra/typeorm/entities/Topic';

type PromptAnswers = {
  startTopicId: number;
  endTopicId: number;
};

const sleep = ms =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

const BATCH_SIZE = 50;

const scrape = async () => {
  const answers = await inquirer.prompt<PromptAnswers>([
    {
      name: 'startTopicId',
      type: 'number',
      message: 'Topic ID start?'
    },
    {
      name: 'endTopicId',
      type: 'number',
      message: 'Topic ID end?',
      validate: (value, { startTopicId }) => value > startTopicId || 'Can not be lower than the start value'
    }
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
    left join topics on
      all_ids.id = topics.topic_id
    where
      topics.topic_id is null
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

    // eslint-disable-next-line no-await-in-loop
    for await (const id of batch) {
      console.log(`Checking topic of id ${id}`);

      const { post: forumPost, topic } = await postScraper.scrapeTopicOp(id);

      if (forumPost && topic) {
        const loycePost = await scrapeLoyceArchivePost(forumPost.post_id);
        const post: Post = { ...forumPost, content: loycePost?.content ?? forumPost.content };
        postsToInsert.push(post);
        topicsToInsert.push(topic);
        continue;
      }

      console.log(`Topic of id ${id} not found`);
    }

    console.log('postsToInsert length', postsToInsert.length);
    if (postsToInsert.length) {
      // eslint-disable-next-line no-await-in-loop
      await connection.manager.createQueryBuilder().insert().into(Post).values(postsToInsert).orIgnore().execute();
    }

    console.log('topicsToInsert length', topicsToInsert.length);
    if (topicsToInsert.length) {
      // eslint-disable-next-line no-await-in-loop
      await connection.manager.createQueryBuilder().insert().into(Topic).values(topicsToInsert).orIgnore().execute();
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(1000);
  }
};

scrape();
