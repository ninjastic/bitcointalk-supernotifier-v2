import { Router } from 'express';

import MeritsController from '../controllers/MeritsController';
import MeritsTopFriendsController from '../controllers/MeritsTopFriendsController';

const meritsController = new MeritsController();
const meritsTopFriendsController = new MeritsTopFriendsController();

const meritsRouter = Router();

meritsRouter.get('/', meritsController.index);
meritsRouter.get('/friends', meritsTopFriendsController.index);

export default meritsRouter;
