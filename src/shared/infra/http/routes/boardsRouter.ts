import { Router } from 'express';

import BoardsController from '../controllers/BoardsController';
import PostsBoardsPeriodController from '../controllers/PostsBoardsPeriodController';

const boardsController = new BoardsController();
const postsBoardsPeriodController = new PostsBoardsPeriodController();

const boardsRouter = Router();

boardsRouter.get('/', boardsController.index);
boardsRouter.get('/top', postsBoardsPeriodController.show);

export default boardsRouter;
