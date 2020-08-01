import Merit from '../infra/schemas/Merit';
import CreateMeritDTO from '../dtos/CreateMeritDTO';

export default interface IMeritsRepository {
  create(data: CreateMeritDTO): Merit;
  save(merit: Merit): Promise<Merit>;
  findOne(merit: Merit): Promise<Merit | null>;
}
