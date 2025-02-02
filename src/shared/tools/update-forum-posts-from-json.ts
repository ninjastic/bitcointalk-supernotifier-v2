import 'dotenv/config';
import fs from 'fs';
import { createConnection } from 'typeorm';

import Post from '../../modules/posts/infra/typeorm/entities/Post';

const fileName = process.argv[2];

if (!fileName) {
  console.error('Missing json file.');
  process.exit(1);
}

type PostData = {
  postId: number;
  title: string;
  content: string;
};

const rawData = fs.readFileSync(fileName, 'utf8');
const data: PostData[] = JSON.parse(rawData);

const run = async () => {
  const connection = await createConnection();

  for (const post of data) {
    // eslint-disable-next-line no-await-in-loop
    await connection
      .createQueryBuilder()
      .update(Post)
      .set({
        title: post.title,
        content: post.content
      })
      .where('post_id = :postId', { postId: post.postId })
      .execute();

    console.log(`Updated post ${post.postId}`);
  }
};

run();
