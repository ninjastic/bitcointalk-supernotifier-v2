import { container } from 'tsyringe';
import { Request, Response } from 'express';

import FindAddressesByAuthorService from '../../../../modules/posts/services/FindAddressesByAuthorService';

export default class AddressAuthorsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const findAddressesByAuthor = container.resolve(
      FindAddressesByAuthorService,
    );

    const { username } = request.params;

    const foundAddresses = await findAddressesByAuthor.execute(
      username.toLowerCase(),
    );

    if (!foundAddresses.length) {
      return response.status(404).json({ error: 'Not found' });
    }

    return response.json(foundAddresses);
  }
}
