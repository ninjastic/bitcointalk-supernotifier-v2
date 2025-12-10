import type { DeleteResult, Repository } from 'typeorm';

import { getRepository } from 'typeorm';

import type { ICreateTrackedBoardDTO } from '../../../dtos/ICreateTrackedBoardDTO';

import TrackedBoard from '../entities/TrackedBoard';

type TrackedBoardWithoutRelations = Omit<TrackedBoard, 'board' | 'user'>;

export default class TrackedBoardsRepository {
  private ormRepository: Repository<TrackedBoard>;

  constructor() {
    this.ormRepository = getRepository(TrackedBoard);
  }

  public create(data: ICreateTrackedBoardDTO): TrackedBoardWithoutRelations {
    return this.ormRepository.create(data);
  }

  public async save(trackedBoard: TrackedBoardWithoutRelations): Promise<TrackedBoardWithoutRelations> {
    return this.ormRepository.save(trackedBoard);
  }

  public async batchSave(trackedBoards: TrackedBoardWithoutRelations[]): Promise<TrackedBoardWithoutRelations[]> {
    return this.ormRepository.save(trackedBoards);
  }

  public async find(): Promise<TrackedBoard[]> {
    return this.ormRepository.find({
      relations: ['board', 'user'],
    });
  }

  public async findOne(where?: ICreateTrackedBoardDTO): Promise<TrackedBoard> {
    return this.ormRepository.findOne({
      where,
      relations: ['board', 'user'],
    });
  }

  public async findByTelegramId(telegramId: string): Promise<TrackedBoard[]> {
    return this.ormRepository.find({
      where: {
        telegram_id: telegramId,
      },
      order: { board_id: 'ASC' },
      relations: ['board', 'user'],
    });
  }

  public async delete(telegramId: string, boardId: number): Promise<DeleteResult> {
    return this.ormRepository.delete({ telegram_id: telegramId, board_id: boardId });
  }
}
