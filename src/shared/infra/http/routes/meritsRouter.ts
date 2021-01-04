import { Router } from 'express';

import MeritsController from '../controllers/MeritsController';
import MeritsTopFansController from '../controllers/MeritsTopFansController';
import MeritsCountController from '../controllers/MeritsCountController';

const meritsController = new MeritsController();
const meritsTopFansController = new MeritsTopFansController();
const meritsCountController = new MeritsCountController();

const meritsRouter = Router();

meritsRouter.get('/', meritsController.index);
meritsRouter.get('/count', meritsCountController.show);
meritsRouter.get('/fans', meritsTopFansController.index);

export default meritsRouter;
