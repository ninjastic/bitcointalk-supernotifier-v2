/* eslint-disable no-console */
import 'dotenv/config.js';
import 'reflect-metadata';
import inquirer from 'inquirer';
import chalk from 'chalk';

import esClient from '../../services/elastic';
import logger from '../../services/logger';

type PromptResponse = {
  newContent: string;
};

export const censorPostsMenu = async (): Promise<void> => {
  const defaultNewContent = 'Censored by TryNinja due to a privacy request';
  let post = null;

  const { newContent } = await inquirer
    .prompt<PromptResponse>([
      {
        type: 'input',
        name: 'post_id',
        message: 'Post ID to edit',
        validate: async value => {
          if (!value || Number.isNaN(Number(value))) {
            return false;
          }

          const search = await esClient.search({
            index: 'posts',
            query: {
              match: {
                post_id: value
              }
            }
          });

          if (!search.hits.hits.length) {
            return false;
          }

          post = search.hits.hits.at(0);
          return post !== null;
        }
      },
      {
        type: 'input',
        name: 'newContent',
        default: defaultNewContent
      }
    ])
    .catch(err => {
      logger.error(err);
      process.exit();
    });

  Object.entries(post._source).forEach(([key, value]) => {
    console.info(chalk.green(`${key}: `), value);
  });

  console.info(chalk.red('\nNew content:', newContent));

  const confirm = (await inquirer
    .prompt({
      type: 'confirm',
      name: 'choice',
      message: 'Edit into database?',
      default: false
    })
    .catch(() => process.exit())) as { choice: boolean };

  if (confirm.choice) {
    await esClient.update({
      index: post._index,
      id: post._id,
      doc: {
        content: newContent
      }
    });
  } else {
    console.log('Canceled!');
  }

  process.exit();
};
