import type { DeleteResult } from 'typeorm';

import type ICreateAdvancedMatchDTO from '../dtos/ICreateAdvancedMatchDTO';
import type IFindAdvancedMatchDTO from '../dtos/IFindAdvancedMatchDTO';
import type AdvancedMatch from '../infra/typeorm/entities/AdvancedMatch';

export default interface IAdvancedMatchesRepository {
  create: (data: ICreateAdvancedMatchDTO) => AdvancedMatch;
  save: (advancedMatch: AdvancedMatch) => Promise<AdvancedMatch>;
  find: (conditions: IFindAdvancedMatchDTO) => Promise<AdvancedMatch[]>;
  findAll: () => Promise<AdvancedMatch[]>;
  findOne: (conditions: IFindAdvancedMatchDTO) => Promise<AdvancedMatch>;
  delete: (advancedMatch: AdvancedMatch) => Promise<DeleteResult>;
}
