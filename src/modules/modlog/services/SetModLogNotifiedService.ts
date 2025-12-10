import { inject, injectable } from 'tsyringe';

import type FindModLogDTO from '../dtos/FindModLogDTO';
import type IModLogRepository from '../repositories/IModLogRepository';

@injectable()
export default class SetModLogNotifiedService {
  constructor(
    @inject('ModLogRepository')
    private modLogRepository: IModLogRepository,
  ) {}

  public async execute(data: FindModLogDTO, telegram_id: string): Promise<void> {
    const modLog = await this.modLogRepository.findOne(data);

    modLog.notified = true;
    modLog.notified_to.push(telegram_id);

    await this.modLogRepository.save(modLog);
  }
}
