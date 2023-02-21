/* eslint-disable no-console */
import chalk from 'chalk';
import inquirer from 'inquirer';
import { container } from 'tsyringe';
import { getManager } from 'typeorm';

import Post from '../../../modules/posts/infra/typeorm/entities/Post';
import ScrapePostService from '../../../modules/posts/services/ScrapePostService';

export const scrapePostMenu = async (): Promise<void> => {
  const scrapePost = container.resolve(ScrapePostService);

  await inquirer
    .prompt([
      {
        type: 'input',
        name: 'topic_id',
        message: `Id of the topic`,
        validate: value => value && !Number.isNaN(Number(value))
      },
      {
        type: 'input',
        name: 'post_id',
        message: `Id of the post`,
        validate: value => value && !Number.isNaN(Number(value))
      }
    ])
    .then(async ({ post_id, topic_id }) => {
      const post = await scrapePost.execute({ post_id, topic_id });

      if (!post) {
        console.info('Post not found!');
        process.exit();
      }

      Object.entries(post).forEach(([key, value]) => {
        console.info(chalk.green(`${key}: `), value);
      });

      const confirm = (await inquirer
        .prompt({
          type: 'confirm',
          name: 'choice',
          message: 'Insert into database?',
          default: false
        })
        .catch(() => process.exit())) as { choice: boolean };

      if (confirm.choice) {
        const manager = getManager();

        await manager
          .createQueryBuilder()
          .insert()
          .into(Post)
          .values([post])
          .onConflict('("post_id") DO NOTHING')
          .execute()
          .then(r =>
            r.identifiers.length
              ? console.info(`Inserted with id ${r.identifiers[0].id}`)
              : console.log('Could not insert post')
          );
      } else {
        console.info('Canceled!');
      }

      process.exit();
    });
};
