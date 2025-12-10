import 'dotenv/config';
import 'reflect-metadata';
import { PostScraper } from '##/modules/posts/services/scraper/post-scraper';
import chalk from 'chalk';
import inquirer from 'inquirer';

import '../../container';

import { createConnection, getManager } from 'typeorm';

import Post from '../../../modules/posts/infra/typeorm/entities/Post';

export async function scrapePostMenu(): Promise<void> {
  await createConnection();
  const postScraper = new PostScraper();
  await inquirer
    .prompt([
      {
        type: 'input',
        name: 'data',
        message: 'URL of post',
        filter: (value) => {
          const [, postId] = value.match(/\.msg(\d+)/);
          return [postId];
        },
        validate: data => data.length === 2,
      },
    ])
    .then(async ({ data: [post_id] }) => {
      const { post } = await postScraper.scrapePost(post_id);

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
          default: false,
        })
        .catch(() => process.exit())) as { choice: boolean };

      if (confirm.choice) {
        const manager = getManager();

        await manager
          .createQueryBuilder()
          .insert()
          .into(Post)
          .values([post])
          .onConflict(
            '("post_id") DO UPDATE SET title=EXCLUDED.title, content=EXCLUDED.content, updated_at=EXCLUDED.updated_at',
          )
          .execute()
          .then(r =>
            r.identifiers.length
              ? console.info(`Inserted with id ${r.identifiers[0].id}`)
              : console.log('Could not insert post'),
          );
      }
      else {
        console.info('Canceled!');
      }

      process.exit();
    });
}
