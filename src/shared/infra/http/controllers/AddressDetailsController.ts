import { container } from 'tsyringe';
import { Request, Response } from 'express';
import Joi from 'joi';

import logger from '../../../services/logger';

import GetAddressDetailsService from '../services/GetAddressDetailsService';

export default class AddressDetailsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getAddressDetails = container.resolve(GetAddressDetailsService);

    const addressRegex =
      /0x[a-fA-F0-9]{40}|(bc(0([ac-hj-np-z02-9]{39}|[ac-hj-np-z02-9]{59})|1[ac-hj-np-z02-9]{8,87})|[13][a-km-zA-HJ-NP-Z1-9]{25,35})|\bT[A-Za-z1-9]{33}\b/;

    const schemaValidation = Joi.object({
      address: Joi.string().regex(addressRegex).message('Address is invalid').required(),
      route: Joi.string()
    });

    const query = { ...request.params, ...request.query } as {
      address: string;
      route: string;
    };

    try {
      await schemaValidation.validateAsync(query);
    } catch (error) {
      return response.status(400).json({
        result: 'fail',
        message: error.details[0].message,
        data: null
      });
    }

    try {
      const data = await getAddressDetails.execute(query);

      const result = {
        result: 'success',
        message: null,
        data: data || null
      };

      return response.json(result);
    } catch (error) {
      logger.error({
        error: error.message,
        stack: error.stack,
        controller: 'AddressDetailsController'
      });
      return response.status(500).json({ result: 'fail', message: 'Something went wrong', data: null });
    }
  }
}
