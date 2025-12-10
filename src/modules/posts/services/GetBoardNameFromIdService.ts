import { inject, injectable } from 'tsyringe';
import { getManager } from 'typeorm';

import type ICacheProvider from '../../../shared/container/providers/models/ICacheProvider';

@injectable()
export default class GetBoardNameFromIdService {
  constructor(
    @inject('CacheRepository')
    private cacheRepository: ICacheProvider,
  ) {}

  public async execute(board_id: number): Promise<string | undefined> {
    const cachedData = await this.cacheRepository.recover<string>(`boardName:${board_id}`);

    if (cachedData) {
      return cachedData;
    }

    const data = await getManager()
      .query('SELECT name FROM boards WHERE board_id = $1', [board_id])
      .then(boards => (boards.length ? boards[0].name : null));

    await this.cacheRepository.save(`boardName:${board_id}`, data);

    return data;
  }
}
