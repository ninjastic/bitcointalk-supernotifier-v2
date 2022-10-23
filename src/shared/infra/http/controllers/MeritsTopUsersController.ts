import { Request, Response } from 'express';
import Joi from 'joi';
import bodybuilder from 'bodybuilder';

import esClient from '../../../services/elastic';
import logger from '../../../services/logger';

import GetBoardChildrensFromIdService from '../../../../modules/posts/services/GetBoardChildrensFromIdService';

export default class MeritsTopUsersController {
  public async index(request: Request, response: Response): Promise<Response> {
    const schemaValidation = Joi.object({
      post_id: Joi.number(),
      topic_id: Joi.number(),
      receiver: Joi.string(),
      receiver_uid: Joi.number(),
      sender: Joi.string(),
      sender_uid: Joi.number(),
      amount: Joi.number(),
      board: Joi.number(),
      child_boards: Joi.string().allow('1', '0', 'true', 'false').insensitive(),
      after_date: Joi.string().isoDate(),
      before_date: Joi.string().isoDate(),
      order: Joi.string().allow('asc', 'desc').insensitive(),
      limit: Joi.number(),
    });

    try {
      await schemaValidation.validateAsync(request.query);
    } catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null,
      });
    }

    try {
      const { query } = request;
      const queryBuilder = bodybuilder();

      if (query.receiver) {
        queryBuilder.addQuery('match_phrase', 'receiver', query.receiver);
      }

      if (query.sender) {
        queryBuilder.addQuery('match_phrase', 'sender', query.sender);
      }

      if (query.after_date) {
        queryBuilder.query('range', {
          date: {
            gte: query.after_date,
          },
        });
      }

      if (query.before_date) {
        queryBuilder.query('range', {
          date: {
            lte: query.before_date,
          },
        });
      }

      if (query.board) {
        if (
          query.child_boards === '1' ||
          query.child_boards?.toString().toLowerCase() === 'true'
        ) {
          const getBoardChildrensFromId = new GetBoardChildrensFromIdService();
          const boards = await getBoardChildrensFromId.execute(
            Number(query.board),
          );

          queryBuilder.query('terms', 'board_id', boards);
        } else {
          queryBuilder.query('terms', 'board_id', [query.board]);
        }
      }

      const simpleMatchParams = [
        'post_id',
        'topic_id',
        'receiver_uid',
        'sender_uid',
        'amount',
      ];

      simpleMatchParams.forEach(param => {
        if (query[param]) {
          queryBuilder.addQuery('match', param, query[param]);
        }
      });

      if (query.limit) {
        queryBuilder.size(Math.min(Number(query.limit), 1000));
      }

      queryBuilder.sort('date', query.order?.toString() || 'DESC');

      queryBuilder.aggregation(
        'terms',
        'sender_uid',
        { size: 1000 },
        senderAgg =>
          senderAgg.aggregation(
            'terms',
            'receiver_uid',
            { size: 1000 },
            receiverAgg =>
              receiverAgg
                .aggregation('sum', 'amount', 'count')
                .aggregation('top_hits', { size: 1 }, 'top_hit'),
          ),
      );

      const body = queryBuilder.build();

      const results = await esClient.search({
        index: 'merits',
        track_total_hits: true,
        body,
      });

      const data = [];

      results.body.aggregations.agg_terms_sender_uid.buckets.forEach(
        senderBucket => {
          senderBucket.agg_terms_receiver_uid.buckets.forEach(
            receiverBucket => {
              data.push({
                sender: receiverBucket.top_hit.hits.hits[0]._source.sender,
                sender_uid: senderBucket.key,
                receiver: receiverBucket.top_hit.hits.hits[0]._source.receiver,
                receiver_uid: receiverBucket.key,
                amount: receiverBucket.count.value,
                num_transactions: receiverBucket.doc_count,
              });
            },
          );
        },
      );

      data.sort((a, b) => b.amount - a.amount);

      const result = {
        result: 'success',
        message: null,
        data,
      };

      return response.json(result);
    } catch (error) {
      logger.error({
        error: error.message,
        stack: error.stack,
        controller: 'MeritsTopUsersController',
      });
      return response
        .status(500)
        .json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
