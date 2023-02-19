import { Request, Response } from 'express';
import GetUsersDataService from '../../services/bpip/GetUsersDataService';

import ParseUsersScopeService from '../../services/bpip/ParseUsersScopeService';

export default class UsersController {
  public async index(request: Request, response: Response): Promise<Response> {
    const parseUsersScopeService = new ParseUsersScopeService();
    const getUsersData = new GetUsersDataService();

    const { body } = request;

    try {
      const scope = parseUsersScopeService.execute({ scope: body.scope });
      const data = await getUsersData.execute({ scope, items: body.items });

      return response.json({ result: 'success', message: null, data });
    } catch (error) {
      return response.json({
        result: 'fail',
        message: error.message || 'Something went wrong',
        data: null
      });
    }
  }
}
