import { getRepository, Repository, IsNull } from 'typeorm';
import Board from '../entities/Board';

export default class BoardRepository {
  private ormRepository: Repository<Board>;

  constructor() {
    this.ormRepository = getRepository(Board);
  }

  public async find(onlyParents = false): Promise<Board[]> {
    const where = {} as any;

    if (onlyParents) {
      where.parent_id = IsNull();
    }
    return this.ormRepository.find({ where, order: { board_id: 'ASC' } });
  }
}
