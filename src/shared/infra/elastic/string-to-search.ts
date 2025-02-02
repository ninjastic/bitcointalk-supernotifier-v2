import 'reflect-metadata';
import 'dotenv/config';
import esClient from 'shared/services/elastic';

interface ElasticsearchQuery {
  query: {
    bool: {
      must: any[];
      should?: any[];
      filter?: any[];
    };
  };
}

interface SearchParams {
  author?: string;
  board_id?: number;
  content?: string;
  from_date?: string;
  to_date?: string;
  include_quotes: boolean;
}

function parseSearchString(searchString: string): SearchParams {
  const params: SearchParams = {
    include_quotes: false
  };

  const parts = searchString.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

  for (const part of parts) {
    if (part.includes(':')) {
      const [key, value] = part.split(':');
      switch (key.trim().toLowerCase()) {
        case 'author':
          searchString = searchString.replace(part, '');
          params.author = value.trim().replace(/"/g, '');
          break;
        case 'board_id':
          searchString = searchString.replace(part, '');
          params.board_id = parseInt(value.trim(), 10);
          break;
        case 'from_date':
          searchString = searchString.replace(part, '');
          params.from_date = value.trim().replace(/"/g, '');
          break;
        case 'to_date':
          searchString = searchString.replace(part, '');
          params.to_date = value.trim().replace(/"/g, '');
          break;
        case 'include_quotes':
          searchString = searchString.replace(part, '');
          params.include_quotes = value.trim().toLowerCase() === 'true';
          break;
        default:
          break;
      }
    }
  }

  params.content = searchString.trim().replace(/"/g, '');

  return params;
}

function buildElasticsearchQuery(params: SearchParams): ElasticsearchQuery {
  const query: ElasticsearchQuery = {
    query: {
      bool: {
        must: []
      }
    }
  };

  if (params.author) {
    query.query.bool.must.push({
      term: { 'author.keyword': params.author }
    });
  }

  if (params.board_id) {
    query.query.bool.must.push({
      term: { board_id: params.board_id }
    });
  }

  if (params.content) {
    const contentQuery = {
      simple_query_string: {
        query: params.content,
        fields: params.include_quotes ? ['content', 'quotes'] : ['content'],
        default_operator: 'AND'
      }
    };
    query.query.bool.must.push(contentQuery);
  }

  if (params.from_date || params.to_date) {
    const rangeQuery: any = { range: { date: {} } };
    if (params.from_date) rangeQuery.range.date.gte = params.from_date;
    if (params.to_date) rangeQuery.range.date.lte = params.to_date;
    query.query.bool.filter.push(rangeQuery);
  }

  return query;
}

function searchElasticsearch(searchString: string): ElasticsearchQuery {
  const params = parseSearchString(searchString);
  return buildElasticsearchQuery(params);
}

const searchString = 'author:TryNinja';
const elasticsearchQuery = searchElasticsearch(searchString);

const main = async () => {
  const results = await esClient.search({
    index: 'posts_v2',
    track_total_hits: true,
    ...elasticsearchQuery
  });

  console.log(results.hits.total, results.hits.hits);
  console.log(elasticsearchQuery.query.bool.must);
};

main();
