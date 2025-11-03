import type { DeleteResult } from 'typeorm';

import type TrackedPhrase from '../infra/typeorm/entities/TrackedPhrase';

import type ICreateTrackedPhraseDTO from '../dtos/ICreateTrackedPhraseDTO';
import type IFindTrackedPhraseDTO from '../dtos/IFindTrackedPhraseDTO';

export default interface ITrackedPhrasesRepository {
  create(data: ICreateTrackedPhraseDTO): TrackedPhrase;
  save(trackedPhrase: TrackedPhrase): Promise<TrackedPhrase>;
  find(conditions: IFindTrackedPhraseDTO): Promise<TrackedPhrase[]>;
  findAll(): Promise<TrackedPhrase[]>;
  findOne(conditions: IFindTrackedPhraseDTO): Promise<TrackedPhrase>;
  delete(trackedPhrase: TrackedPhrase): Promise<DeleteResult>;
}
