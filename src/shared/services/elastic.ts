import { Client } from '@elastic/elasticsearch';

const esClient = new Client({
  node: process.env.ELASTIC_SEARCH_URL,
  auth: {
    username: process.env.ELASTIC_SEARCH_USER,
    password: process.env.ELASTIC_SEARCH_PASSWORD
  },
  compression: true,
  requestTimeout: 5 * 60 * 1000
});

export default esClient;
