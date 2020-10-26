import { Router } from 'express';

import UserInfoController from '../controllers/UserInfoController';
import UserPostsBoardsController from '../controllers/UserPostsBoardsController';
import UserPostsPeriodsController from '../controllers/UserPostsPeriodsController';
import UserMeritsCountController from '../controllers/UserMeritsCountController';
import UserAddressesController from '../controllers/UserAddressesController';
import UserTopTopicsController from '../controllers/UserTopTopicsController';

const userPostsBoardsController = new UserPostsBoardsController();
const userPostsPeriodsController = new UserPostsPeriodsController();
const userMeritsCountController = new UserMeritsCountController();
const userAddressesController = new UserAddressesController();
const userInfoController = new UserInfoController();
const userTopTopicsController = new UserTopTopicsController();

const usersRouter = Router();

usersRouter.get('/:username', userInfoController.show);
usersRouter.get('/:username/boards', userPostsBoardsController.show);
usersRouter.get('/:username/posts', userPostsPeriodsController.show);
usersRouter.get('/:username/merits', userMeritsCountController.show);
usersRouter.get('/:username/addresses', userAddressesController.show);
usersRouter.get('/:username/topics', userTopTopicsController.show);

export default usersRouter;
