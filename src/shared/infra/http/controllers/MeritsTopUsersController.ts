import { Request, Response } from 'express';
import Joi from 'joi';
import bodybuilder from 'bodybuilder';

import esClient from '../../../services/elastic';
import logger from '../../../services/logger';

import GetBoardChildrensFromIdService from '../../../../modules/posts/services/GetBoardChildrensFromIdService';

export default class MeritsTopUsersController {
  public async index(request: Request, response: Response): Promise<Response> {
    const schemaValidation = Joi.object({
      board: Joi.number().required(),
      child_boards: Joi.string().allow('1', '0', 'true', 'false').insensitive(),
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
