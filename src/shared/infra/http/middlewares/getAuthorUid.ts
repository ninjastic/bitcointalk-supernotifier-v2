import type { NextFunction, Request, Response } from 'express';

import { container } from 'tsyringe';

import GetAuthorUIDFromUsernameService from '../services/GetAuthorUIDFromUsernameService';

async function getAuthorUid(request: Request, response: Response, next: NextFunction): Promise<Response | void> {
  const getAuthorUIDFromUsername = container.resolve(GetAuthorUIDFromUsernameService);

  if (request.params.username) {
    const data = await getAuthorUIDFromUsername.execute({
      username: request.params.username,
    });

    if (!data) {
      return response.json({
        result: 'success',
        message: 'User not found',
        data: null,
      });
    }

    request.author_uid = data.author_uid;
  }
  else if (request.params.author_uid) {
    request.author_uid = request.params.author_uid ? Number(request.params.author_uid) : null;
  }

  return next();
}

export default getAuthorUid;
