import 'dotenv/config';
import 'reflect-metadata';
import inquirer from 'inquirer';
import { container } from 'tsyringe';
import { createConnection } from 'typeorm';

import GetPostsService from '../../../modules/posts/services/GetPostsService';
import esClient from '../../services/elastic';
import '../../container';

interface PromptResponse {
  from: string;
  to: string;
}

async function main() {
  await createConnection();
  const getPosts = container.resolve(GetPostsService);

  const { from, to } = await inquirer
    .prompt<PromptResponse>([
      {
        type: 'input',
        name: 'from',
        message: 'From Id',
        validate: value => !Number.isNaN(Number(value)),
      },
      {
        type: 'input',
        name: 'to',
        message: 'To Id',
        validate: value => !Number.isNaN(Number(value)),
      },
    ])
    .catch(() => process.exit());

  const posts = await getPosts.execute({
    after: Number(from),
    last: Number(to),
  });

  const operations = posts.flatMap(doc => [{ index: { _index: 'posts' } }, doc]);

  const response = await esClient.bulk({ body: operations });

  console.log(response);
}

main();
