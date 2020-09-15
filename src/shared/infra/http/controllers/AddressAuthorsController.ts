import { container } from 'tsyringe';
import { Request, Response } from 'express';

import FindAuthorsByAddressService from '../../../../modules/posts/services/FindAuthorsByAddressService';

export default class AddressAuthorsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const findAuthorsByAddress = container.resolve(FindAuthorsByAddressService);

    const { address } = request.params;

    const foundAuthors = await findAuthorsByAddress.execute(address);

    if (!foundAuthors.length) {
      return response.status(404).json({ error: 'Not found' });
    }

    return response.json(foundAuthors);
  }
}
