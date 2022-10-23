import { getManager } from 'typeorm';

export default class GetBoardChildrensFromIdService {
  public async execute(board_id: number): Promise<string[] | undefined> {
    const query = await getManager().query(
      'WITH RECURSIVE child_board AS (SELECT board_id, name, parent_id FROM boards where board_id = $1 UNION SELECT b.board_id, b.name, b.parent_id FROM boards b INNER JOIN child_board c ON b.parent_id = c.board_id ) SELECT * FROM child_board',
      [board_id],
    );

    const boards = query.map(board => board.board_id);

    return boards;
  }
}
