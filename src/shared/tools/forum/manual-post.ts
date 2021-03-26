/* eslint-disable no-console */
import 'dotenv/config.js';
import 'reflect-metadata';
import { createConnection, getManager } from 'typeorm';
import { prompt } from 'enquirer';
import { container } from 'tsyringe';

import '../../infra/typeorm';
import '../../container';

import Post from '../../../modules/posts/infra/typeorm/entities/Post';
import CreatePostService from '../../../modules/posts/services/CreatePostService';

createConnection().then(async () => {
  const createPost = container.resolve(CreatePostService);

  const response = await prompt([
    {
      type: 'input',
      name: 'title',
      message: `Title of the post`,
      initial: 'This is a post',
    },
    {
      type: 'input',
      name: 'content',
      message: 'Content of the post',
      initial: 'Hello @TryNinja!',
    },
    {
      type: 'input',
      name: 'author',
      message: 'Author of the post',
      initial: 'satoshi',
    },
    {
      type: 'input',
      name: 'author_uid',
      message: 'Author UID of the post',
      initial: '3',
      validate: value => {
        return !Number.isNaN(Number(value));
      },
    },
    {
      type: 'input',
      name: 'board_id',
      message: 'Board ID of the post',
      initial: '24',
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
        return !Number.isNaN(Number(value));
      },
    },
  ]).catch(() => process.exit());

  const randomId = Math.floor(Math.random() * Math.floor(10000));

  const post = {
    ...response,
    post_id: Number(`99990${randomId}`),
    date: new Date(),
    notified: false,
    notified_to: [],
    checked: false,
    boards: [],
    archive: false,
  } as Post;

  const createdPost = createPost.execute(post);

  console.log(createdPost);

  const confirm = (await prompt({
    type: 'confirm',
    name: 'choice',
    message: 'Insert into database?',
  }).catch(() => process.exit())) as { choice: boolean };

  if (confirm.choice) {
    const manager = getManager();

    await manager
      .createQueryBuilder()
      .insert()
      .into(Post)
      .values([createdPost])
      .onConflict('("post_id") DO NOTHING')
      .execute()
      .then(r => console.log(`Inserted with id ${r.identifiers[0].id}`));
  }

  process.exit();
});
