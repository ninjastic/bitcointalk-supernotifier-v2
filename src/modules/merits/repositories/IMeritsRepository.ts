import Merit from '../infra/schemas/Merit';
import CreateMeritDTO from '../dtos/CreateMeritDTO';
import FindMeritDTO from '../dtos/FindMeritDTO';

export default interface IMeritsRepository {
  create(data: CreateMeritDTO): Merit;
  save(merit: Merit): Promise<Merit>;
  findOne(merit: FindMeritDTO): Promise<Merit | null>;
  getLatestUncheckedMerits(limit: number): Promise<Merit[]>;
}
