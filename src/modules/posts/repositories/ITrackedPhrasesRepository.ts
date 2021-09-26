import { DeleteResult } from 'typeorm';

import TrackedPhrase from '../infra/typeorm/entities/TrackedPhrase';

import ICreateTrackedPhraseDTO from '../dtos/ICreateTrackedPhraseDTO';
import IFindTrackedPhraseDTO from '../dtos/IFindTrackedPhraseDTO';

export default interface ITrackedPhrasesRepository {
  create(data: ICreateTrackedPhraseDTO): TrackedPhrase;
  save(trackedPhrase: TrackedPhrase): Promise<TrackedPhrase>;
  find(conditions: IFindTrackedPhraseDTO): Promise<TrackedPhrase[]>;
  findAll(): Promise<TrackedPhrase[]>;
  findOne(conditions: IFindTrackedPhraseDTO): Promise<TrackedPhrase>;
  delete(trackedPhrase: TrackedPhrase): Promise<DeleteResult>;
}
