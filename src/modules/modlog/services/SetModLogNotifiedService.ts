import { inject, injectable } from 'tsyringe';

import IModLogRepository from '../repositories/IModLogRepository';
import FindModLogDTO from '../dtos/FindModLogDTO';

@injectable()
export default class SetModLogNotifiedService {
  constructor(
    @inject('ModLogRepository')
    private modLogRepository: IModLogRepository,
  ) {}

  public async execute(
    data: FindModLogDTO,
    telegram_id: number,
  ): Promise<void> {
    const modLog = await this.modLogRepository.findOne(data);

    modLog.notified = true;
    modLog.notified_to.push(telegram_id);

    await this.modLogRepository.save(modLog);
  }
}
