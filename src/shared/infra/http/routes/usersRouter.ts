import { Router } from 'express';

import getAuthorUid from '../middlewares/getAuthorUid';

import UserInfoController from '../controllers/UserInfoController';
import UserPostsBoardsController from '../controllers/UserPostsBoardsController';
import UserPostsPeriodsController from '../controllers/UserPostsPeriodsController';
import UserMeritsCountController from '../controllers/UserMeritsCountController';
import UserTopTopicsController from '../controllers/UserTopTopicsController';
import UserTopicsUniqueController from '../controllers/UserTopicsUniqueController';

const userInfoController = new UserInfoController();
const userPostsBoardsController = new UserPostsBoardsController();
const userPostsPeriodsController = new UserPostsPeriodsController();
const userMeritsCountController = new UserMeritsCountController();
const userTopTopicsController = new UserTopTopicsController();
const userTopicsUniqueController = new UserTopicsUniqueController();

const usersRouter = Router();
const usersRouterWithId = Router();

usersRouter.use(['/id/:author_uid', '/:username'], getAuthorUid);

usersRouter.get(['/id/:author_uid', '/:username'], userInfoController.show);
usersRouterWithId.get(['/boards', '/boards'], userPostsBoardsController.show);
usersRouterWithId.get(['/posts'], userPostsPeriodsController.show);
usersRouterWithId.get(['/merits'], userMeritsCountController.show);
usersRouterWithId.get(['/topics'], userTopTopicsController.show);
usersRouterWithId.get(['/topics/unique'], userTopicsUniqueController.show);

usersRouter.use(['/id/:author_uid', '/:username'], usersRouterWithId);

export default usersRouter;
