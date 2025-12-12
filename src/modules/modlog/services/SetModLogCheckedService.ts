import { inject, injectable } from 'tsyringe';

import type ModLog from '../infra/typeorm/entities/ModLog';
import type IModLogRepository from '../repositories/IModLogRepository';

@injectable()
export default class SetModLogCheckedService {
  constructor(
    @inject('ModLogRepository')
    private modLogRepository: IModLogRepository,
  ) {}

  public async execute(modLog: ModLog): Promise<void> {
    modLog.checked = true;

    await this.modLogRepository.save(modLog);
  }
}
