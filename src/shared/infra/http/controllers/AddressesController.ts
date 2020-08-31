import { container } from 'tsyringe';
import { Request, Response } from 'express';

import GetAddressService from '../services/GetAddressService';
import GetAddressesService from '../../../../modules/posts/services/GetAddressesService';

export default class AddressesController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getAddress = container.resolve(GetAddressService);

    const { address } = request.params;

    const foundAddress = await getAddress.execute(address);

    if (!foundAddress) {
      return response.status(404).json({ error: 'Not found' });
    }

    return response.json(foundAddress);
  }

  public async index(request: Request, response: Response): Promise<Response> {
    const getAddresses = container.resolve(GetAddressesService);

    const { address, limit } = request.query;

    const addresses = await getAddresses.execute(
      { address: String(address) },
      Number(limit),
    );

    return response.json(addresses);
  }
}
