/* eslint-disable no-console */
import 'dotenv/config.js';
import 'reflect-metadata';
import { prompt } from 'enquirer';
import esClient from '../../services/elastic';

type PromptResponse = {
  post_id: number;
};

const run = async () => {
  const newContent = 'Censored by TryNinja due to a privacy request';

  const response = await prompt<PromptResponse>([
    {
      type: 'input',
      name: 'post_id',
      message: 'Post ID to edit',
      validate: value => {
        return !Number.isNaN(Number(value));
      },
    },
  ]).catch(() => process.exit());

  const search = await esClient.search({
    index: 'posts',
    body: {
      query: {
        match: {
          post_id: response.post_id,
        },
      },
    },
  });

  if (!search.body.hits.hits.length) {
    throw new Error('Post not found');
  }

  const post = search.body.hits.hits[0];

  console.log(post);
  console.log('New content:', newContent);

  const confirm = (await prompt({
    type: 'confirm',
    name: 'choice',
    message: 'Edit into database?',
  }).catch(() => process.exit())) as { choice: boolean };

  if (confirm.choice) {
    await esClient.update({
      index: 'posts',
      id: post._id,
      body: {
        doc: {
          content: newContent,
        },
      },
    });
  } else {
    console.log('Canceled!');
  }

  process.exit();
};

run();
