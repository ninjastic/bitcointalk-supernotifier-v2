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
        name: 'data',
        message: 'URL of post',
        filter: value => {
          const [, topicId, postId] = value.match(/topic=(\d+)\.msg(\d+)/);
          return [topicId, postId];
        },
        validate: data => data.length === 2
      }
    ])
    .then(async ({ data: [topic_id, post_id] }) => {
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
          .onConflict('("post_id") DO UPDATE SET title=EXCLUDED.title, content=EXCLUDED.content')
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
