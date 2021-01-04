import { Router } from 'express';

import MeritsController from '../controllers/MeritsController';
import MeritsCountController from '../controllers/MeritsCountController';
import MeritsTopFansController from '../controllers/MeritsTopFansController';
import MeritsTopBoardsController from '../controllers/MeritsTopBoardsController';

const meritsController = new MeritsController();
const meritsTopFansController = new MeritsTopFansController();
const meritsCountController = new MeritsCountController();
const meritsTopBoardsController = new MeritsTopBoardsController();

const meritsRouter = Router();

meritsRouter.get('/', meritsController.index);
meritsRouter.get('/count', meritsCountController.show);
meritsRouter.get('/fans', meritsTopFansController.index);
meritsRouter.get('/boards', meritsTopBoardsController.index);

export default meritsRouter;
