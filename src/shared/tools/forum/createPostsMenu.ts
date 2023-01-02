/* eslint-disable no-console */
import 'dotenv/config.js';
import 'reflect-metadata';
import { getManager } from 'typeorm';
import inquirer from 'inquirer';
import { container } from 'tsyringe';

import '../../infra/typeorm';
import '../../container';

import chalk from 'chalk';
import logger from '../../services/logger';
import Post from '../../../modules/posts/infra/typeorm/entities/Post';
import CreatePostService from '../../../modules/posts/services/CreatePostService';

export const createPostMenu = async (): Promise<void> =>
  inquirer
    .prompt([
      {
        type: 'input',
        name: 'title',
        message: `Title of the post`,
        initial: 'This is a post',
        validate: value => value,
      },
      {
        type: 'input',
        name: 'content',
        message: 'Content of the post',
        initial: 'Hello @TryNinja!',
        validate: value => value,
      },
      {
        type: 'input',
        name: 'author',
        message: 'Author of the post',
        initial: 'satoshi',
        validate: value => value,
      },
      {
        type: 'input',
        name: 'author_uid',
        message: 'Author UID of the post',
        initial: '3',
        validate: value => {
          return value && !Number.isNaN(Number(value));
        },
      },
      {
        type: 'input',
        name: 'board_id',
        message: 'Board ID of the post',
        initial: '24',
        validate: value => {
          return value && !Number.isNaN(Number(value));
        },
      },
      {
        type: 'input',
        name: 'post_id',
        message: 'ID of the post (optional)',
        validate: value => {
          return !Number.isNaN(Number(value));
        },
      },
      {
        type: 'input',
        name: 'topic_id',
        message: 'Topic ID of the post',
        initial: '5248878',
        validate: value => {
          return value && !Number.isNaN(Number(value));
        },
      },
    ])
    .then(async response => {
      const randomId = Math.floor(Math.random() * Math.floor(10000));
      const createPost = container.resolve(CreatePostService);

      const post = {
        ...response,
        post_id: response.post_id || Number(`99990${randomId}`),
        date: new Date(),
        notified: false,
        notified_to: [],
        checked: false,
        boards: [],
        archive: false,
      } as Post;

      const createdPost = createPost.execute(post);

      Object.entries(createdPost).forEach(([key, value]) => {
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
          .values([createdPost])
          .onConflict('("post_id") DO NOTHING')
          .execute()
          .then(r => console.info(`Inserted with id ${r.identifiers[0].id}`));
      } else {
        console.info('Canceled!');
      }

      process.exit();
    })
    .catch(err => logger.error(err));
