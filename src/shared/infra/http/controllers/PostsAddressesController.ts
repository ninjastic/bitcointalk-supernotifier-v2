import { container } from 'tsyringe';
import { Request, Response } from 'express';

import GetAddressesByPostIdService from '../services/GetAddressesByPostIdService';

export default class PostsAddressesController {
  public async show(request: Request, response: Response): Promise<Response> {
    const getAddressesByPostId = container.resolve(GetAddressesByPostIdService);

    const { id } = request.params;

    const addresses = await getAddressesByPostId.execute(Number(id));

    if (!addresses.length) {
      return response.status(404).json({ error: 'Not found' });
    }

    return response.json(addresses);
  }
}
