import type Merit from '../infra/typeorm/entities/Merit';
import type CreateMeritDTO from '../dtos/CreateMeritDTO';
import type FindMeritDTO from '../dtos/FindMeritDTO';

export default interface IMeritsRepository {
  create(data: CreateMeritDTO): Merit;
  save(merit: Merit): Promise<Merit>;
  findOne(merit: FindMeritDTO): Promise<Merit | null>;
  getLatestUncheckedMerits(limit?: number): Promise<Merit[]>;
  getAmountByUserOnPeriod(author_uid: number): Promise<any>;
}
