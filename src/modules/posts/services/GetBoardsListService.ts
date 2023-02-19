import { getManager } from 'typeorm';

export default class GetBoardsListService {
  public async execute(raw = false): Promise<any[]> {
    const boards = await getManager().query('select board_id, name, parent_id from boards;');

    if (raw) {
      return boards;
    }

    const organizedBoards = [];

    const findAndInsertIntoChildren = (boardsArr, boardToInsert) => {
      let parentIndex = boardsArr.findIndex(organized => organized.value === boardToInsert.parent_id);

      if (parentIndex !== -1) {
        boardsArr[parentIndex].children.push({
          title: boardToInsert.name,
          value: boardToInsert.board_id,
          parent: boardToInsert.parent_id,
          children: []
        });
        return;
      }

      parentIndex = boardsArr.findIndex(organized => {
        if (!organized.children.length) {
          return false;
        }

        return organized.children.find(child => child.parent_id === boardToInsert.board_id);
      });

      if (parentIndex !== -1) {
        boardsArr[parentIndex].children.push({
          title: boardToInsert.name,
          value: boardToInsert.board_id,
          parent: boardToInsert.parent_id,
          children: []
        });
      }

      boardsArr.forEach(board => {
        board.children.forEach(child => {
          findAndInsertIntoChildren([child], boardToInsert);
        });
      });
    };

    boards.forEach(board => {
      if (!board.parent_id) {
        organizedBoards.push({
          title: board.name,
          value: board.board_id,
          parent_id: board.parent_id,
          children: []
        });
      }

      findAndInsertIntoChildren(organizedBoards, board);
    });

    return organizedBoards;
  }
}
