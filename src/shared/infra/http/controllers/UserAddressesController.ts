import { container } from 'tsyringe';
import { Request, Response } from 'express';

import FindAddressesByAuthorService from '../../../../modules/posts/services/FindAddressesByAuthorService';

export default class AddressAuthorsController {
  public async show(request: Request, response: Response): Promise<Response> {
    const findAddressesByAuthor = container.resolve(
      FindAddressesByAuthorService,
    );

    const { username } = request.params;

    const { limit, last } = request.query;

    const [last_address, last_created_at, last_id] = String(last)
      .trim()
      .split(',');

    const foundAddresses = await findAddressesByAuthor.execute({
      username: username.toLowerCase(),
      limit: Number(limit),
      last_address,
      last_created_at: new Date(last_created_at),
      last_id,
    });

    if (!foundAddresses.length) {
      return response.status(404).json({ error: 'Not found' });
    }

    return response.json(foundAddresses);
  }
}
