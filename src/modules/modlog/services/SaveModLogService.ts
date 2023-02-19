import { inject, injectable } from 'tsyringe';

import ModLog from '../infra/typeorm/entities/ModLog';

import ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';
import IModLogRepository from '../repositories/IModLogRepository';

@injectable()
export default class SaveModLogService {
  constructor(
    @inject('ModLogRepository')
    private modLogRepository: IModLogRepository,

    @inject('CacheRepository')
    private cacheRepository: ICacheProvider
  ) {}

  public async execute(modLog: ModLog): Promise<ModLog> {
    const cachedModLog = await this.cacheRepository.recover<ModLog>(
      `modLog:${modLog.type}-${modLog.user_id}-${modLog.topic_id}`
    );

    if (cachedModLog) {
      return cachedModLog;
    }

    const foundModLog = await this.modLogRepository.findOne(modLog);

    if (foundModLog) {
      return foundModLog;
    }

    const createdModLog = this.modLogRepository.create(modLog);
    const savedModLog = await this.modLogRepository.save(createdModLog);

    await this.cacheRepository.save(
      `modLog:${modLog.type}-${modLog.user_id}-${modLog.topic_id}`,
      savedModLog,
      'EX',
      300
    );

    return savedModLog;
  }
}
