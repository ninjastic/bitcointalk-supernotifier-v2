import { inject, injectable } from 'tsyringe';

import type FindModLogDTO from '../dtos/FindModLogDTO';
import type IModLogRepository from '../repositories/IModLogRepository';

@injectable()
export default class SetModLogCheckedService {
  constructor(
    @inject('ModLogRepository')
    private modLogRepository: IModLogRepository,
  ) {}

  public async execute(data: FindModLogDTO): Promise<void> {
    const modLog = await this.modLogRepository.findOne(data);

    modLog.checked = true;

    await this.modLogRepository.save(modLog);
  }
}
