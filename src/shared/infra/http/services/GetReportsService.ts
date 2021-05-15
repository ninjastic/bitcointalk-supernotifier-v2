import { injectable, inject } from 'tsyringe';

import Report from '../../../../modules/reports/infra/typeorm/entities/Report';
import IReportRepository from '../../../../modules/reports/repositories/IReportRepository';

interface Options {
  latest?: boolean;
}

@injectable()
export default class GetReportsService {
  constructor(
    @inject('ReportRepository')
    private reportRepository: IReportRepository,
  ) {}

  public async execute(options?: Options): Promise<Report | Report[]> {
    if (options.latest) {
      return this.reportRepository.findLatest();
    }

    return this.reportRepository.find();
  }
}
