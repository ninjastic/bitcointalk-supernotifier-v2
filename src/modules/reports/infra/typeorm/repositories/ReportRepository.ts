import { Repository, getRepository } from 'typeorm';
import IReportRepository from '../../../repositories/IReportRepository';

import Report from '../entities/Report';

export default class ReportRepository implements IReportRepository {
  private ormRepository: Repository<Report>;

  constructor() {
    this.ormRepository = getRepository(Report);
  }

  public async find(): Promise<Report[]> {
    return this.ormRepository.find({ order: { date: 1 } });
  }

  public async findLatest(): Promise<Report> {
    return this.ormRepository.findOne({ order: { date: -1 } });
  }
}
