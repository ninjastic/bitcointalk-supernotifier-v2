import Report from '../infra/typeorm/entities/Report';

export default interface IReportRepository {
  find(): Promise<Report[]>;
  findLatest(): Promise<Report>;
}
