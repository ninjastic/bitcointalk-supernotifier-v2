import { Router } from 'express';

import MeritsController from '../controllers/MeritsController';

const meritsController = new MeritsController();

const meritsRouter = Router();

meritsRouter.get('/', meritsController.index);

export default meritsRouter;
