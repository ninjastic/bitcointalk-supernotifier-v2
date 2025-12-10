import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

import esClient from '../services/elastic';

const fileName = process.argv[2];
const USER_ID = process.argv[3];

if (!fileName) {
  console.error('Missing json file.');
  process.exit(1);
}

if (!USER_ID) {
  console.error('Missing USER_ID.');
  process.exit(1);
}

const rawData = fs.readFileSync(fileName, 'utf8');
const data: number[] = JSON.parse(rawData);

function saveIdsToJson(ids: string[]) {
  const jsonString = JSON.stringify(ids, null, 2);
  const caminhoArquivo = path.join(process.cwd(), `user-posts-deleted-ids.${USER_ID}.json`);
  fs.writeFileSync(caminhoArquivo, jsonString, 'utf-8');
}

async function main() {
  const results = await esClient.search({
    index: 'posts',
    track_total_hits: true,
    size: 10000,
    query: {
      bool: {
        must: [
          {
            term: {
              author_uid: {
                value: USER_ID,
              },
            },
          },
          {
            range: {
              date: {
                gte: '2023-08-01',
              },
            },
          },
        ],
        must_not: {
          terms: {
            post_id: data,
          },
        },
      },
    },
  });

  const ids = results.hits.hits.map(hit => hit._id);
  console.log('Results:', ids.length);
  saveIdsToJson(ids);
}

main();
