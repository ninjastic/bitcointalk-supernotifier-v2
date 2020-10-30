import { Router } from 'express';

import getAuthorUid from '../middlewares/getAuthorUid';

import UserInfoController from '../controllers/UserInfoController';
import UserPostsBoardsController from '../controllers/UserPostsBoardsController';
import UserPostsPeriodsController from '../controllers/UserPostsPeriodsController';
import UserMeritsCountController from '../controllers/UserMeritsCountController';
import UserTopTopicsController from '../controllers/UserTopTopicsController';

const userInfoController = new UserInfoController();
const userPostsBoardsController = new UserPostsBoardsController();
const userPostsPeriodsController = new UserPostsPeriodsController();
const userMeritsCountController = new UserMeritsCountController();
const userTopTopicsController = new UserTopTopicsController();

const usersRouter = Router();

usersRouter.use(['/id/:author_uid', '/:username'], getAuthorUid);

usersRouter.get(['/id/:author_uid', '/:username'], userInfoController.show);
usersRouter.get(
  ['/id/:author_uid/boards', '/:username/boards'],
  userPostsBoardsController.show,
);
usersRouter.get(
  ['/id/:author_uid/posts', '/:username/posts'],
  userPostsPeriodsController.show,
);
usersRouter.get(
  ['/id/:author_uid/merits', '/:username/merits'],
  userMeritsCountController.show,
);
usersRouter.get(
  ['/id/:author_uid/topics', '/:username/topics'],
  userTopTopicsController.show,
);

export default usersRouter;
