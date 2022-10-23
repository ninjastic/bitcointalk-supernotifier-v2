import { Router } from 'express';

import MeritsController from '../controllers/MeritsController';
import MeritsCountController from '../controllers/MeritsCountController';
import MeritsTopFansController from '../controllers/MeritsTopFansController';
import MeritsTopBoardsController from '../controllers/MeritsTopBoardsController';
import MeritsTopUsersController from '../controllers/MeritsTopUsersController';

const meritsController = new MeritsController();
const meritsTopFansController = new MeritsTopFansController();
const meritsCountController = new MeritsCountController();
const meritsTopBoardsController = new MeritsTopBoardsController();
const meritsTopUsersController = new MeritsTopUsersController();

const meritsRouter = Router();

meritsRouter.get('/', meritsController.index);
meritsRouter.get('/count', meritsCountController.show);
meritsRouter.get('/fans', meritsTopFansController.index);
meritsRouter.get('/boards', meritsTopBoardsController.index);

meritsRouter.get('/users', meritsTopUsersController.index);

export default meritsRouter;
