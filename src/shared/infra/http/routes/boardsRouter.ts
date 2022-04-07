import { Router } from 'express';

import BoardsController from '../controllers/BoardsController';
import PostsBoardsPeriodController from '../controllers/PostsBoardsPeriodController';
import PostsBoardsPeriodTotalController from '../controllers/PostsBoardsPeriodTotalController';

const boardsController = new BoardsController();
const postsBoardsPeriodController = new PostsBoardsPeriodController();
const postsBoardsPeriodTotalController = new PostsBoardsPeriodTotalController();

const boardsRouter = Router();

boardsRouter.get('/', boardsController.index);
boardsRouter.get('/top', postsBoardsPeriodController.show);
boardsRouter.get('/total', postsBoardsPeriodTotalController.show);

export default boardsRouter;
