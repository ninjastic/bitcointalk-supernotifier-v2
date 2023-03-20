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

export const censorAddressesMenu = async (): Promise<void> => {
  const matches = [];

  await inquirer
    .prompt<PromptResponse>([
      {
        type: 'input',
        name: 'post_id',
        message: 'Address to remove',
        validate: async value => {
          const search = await esClient.search({
            index: 'posts_addresses',
            body: {
              query: {
                match: {
                  address: value
                }
              }
            }
          });

          if (!search.body.hits.hits.length) {
            return false;
          }

          for (const match of search.body.hits.hits) {
            matches.push(match._source);
          }

          return search.body.hits.hits.length > 0;
        }
      }
    ])
    .catch(err => {
      logger.error(err);
      process.exit();
    });

  for (const match of matches) {
    Object.entries(match).forEach(([key, value]) => {
      console.info(chalk.green(`${key}: `), value);
    });

    console.log('\n');
  }

  console.log('Matches:', matches.length);

  const confirm = (await inquirer
    .prompt({
      type: 'confirm',
      name: 'choice',
      message: 'Remove from database?',
      default: false
    })
    .catch(() => process.exit())) as { choice: boolean };

  if (confirm.choice) {
    for await (const match of matches) {
      await esClient.delete({
        index: 'posts_addresses',
        id: `${match.address}_${match.post_id}`
      });
    }
  } else {
    console.log('Canceled!');
  }

  process.exit();
};
