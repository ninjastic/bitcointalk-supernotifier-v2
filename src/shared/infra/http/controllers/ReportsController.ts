import { Request, Response } from 'express';
import { container } from 'tsyringe';

import GetReportsService from '../services/GetReportsService';

export default class ReportsController {
  public async index(request: Request, response: Response): Promise<Response> {
    const latest = Boolean(request.query.latest);

    const getReports = container.resolve(GetReportsService);

    const reports = await getReports.execute({ latest });

    return response.json(reports);
  }
}
