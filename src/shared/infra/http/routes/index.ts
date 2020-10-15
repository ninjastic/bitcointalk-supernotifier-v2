import { Router } from 'express';

import PostsController from '../controllers/PostsController';
import PostsDataOnPeriodController from '../controllers/PostsDataOnPeriodController';
import BoardsController from '../controllers/BoardsController';
import TopTopicsPostsPerHourController from '../controllers/TopTopicsPostsPerHourController';
import TopUsersPostsPerHourController from '../controllers/TopUsersPostsPerHourController';
import TopBoardsPostsPerHourController from '../controllers/TopBoardsPostsPerHourController';

import PostsAddressesController from '../controllers/PostsAddressesController';
import TopicsController from '../controllers/TopicsController';
import TopicsAuthorsController from '../controllers/TopicsAuthorsController';

import AddressesController from '../controllers/AddressesController';
import AddressAuthorsController from '../controllers/AddressAuthorsController';
import PostsHistoryController from '../controllers/PostsHistoryController';

import UserInfoController from '../controllers/UserInfoController';
import UserPostsBoardsController from '../controllers/UserPostsBoardsController';
import UserPostsPeriodsController from '../controllers/UserPostsPeriodsController';
import UserMeritsCountController from '../controllers/UserMeritsCountController';
import UserAddressesController from '../controllers/UserAddressesController';
import UserTopTopicsController from '../controllers/UserTopTopicsController';

import AlertsController from '../controllers/AlertsController';

import WebUsersController from '../controllers/WebUsersController';

const routes = Router();

const postsController = new PostsController();
const addressesController = new AddressesController();
const postsAddressesController = new PostsAddressesController();
const topicsController = new TopicsController();
const topicsAuthorsController = new TopicsAuthorsController();
const addressAuthorsController = new AddressAuthorsController();
const postsHistoryController = new PostsHistoryController();
const boardsController = new BoardsController();
const userPostsBoardsController = new UserPostsBoardsController();
const userPostsPeriodsController = new UserPostsPeriodsController();
const userMeritsCountController = new UserMeritsCountController();
const userAddressesController = new UserAddressesController();
const userInfoController = new UserInfoController();
const postsDataOnPeriodController = new PostsDataOnPeriodController();
const alertsController = new AlertsController();
const webUsersController = new WebUsersController();
const userTopTopicsController = new UserTopTopicsController();
const topTopicsPostsPerHourController = new TopTopicsPostsPerHourController();
const topUsersPostsPerHourController = new TopUsersPostsPerHourController();
const topBoardsPostsPerHourController = new TopBoardsPostsPerHourController();

routes.get('/posts', postsController.index);
routes.get('/posts/history', postsHistoryController.index);
routes.get('/posts/count', postsDataOnPeriodController.show);
routes.get('/posts/topic/:topic_id/authors', topicsAuthorsController.show);
routes.get('/posts/topic/:topic_id', topicsController.show);
routes.get('/posts/topics', topTopicsPostsPerHourController.show);
routes.get('/posts/authors', topUsersPostsPerHourController.show);
routes.get('/posts/:ids', postsController.show);
routes.get('/posts/:post_id/history', postsHistoryController.show);

routes.get('/addresses/post/:post_id', postsAddressesController.show);
routes.get('/addresses', addressesController.index);
routes.get('/addresses/:address', addressesController.show);
routes.get('/addresses/:address/authors', addressAuthorsController.show);

routes.get('/users/:username', userInfoController.show);
routes.get('/users/:username/boards', userPostsBoardsController.show);
routes.get('/users/:username/posts', userPostsPeriodsController.show);
routes.get('/users/:username/merits', userMeritsCountController.show);
routes.get('/users/:username/addresses', userAddressesController.show);
routes.get('/users/:username/topics', userTopTopicsController.show);

routes.get('/boards', boardsController.index);
routes.get('/boards/top', topBoardsPostsPerHourController.show);

routes.get('/alerts', alertsController.show);
routes.post('/alerts', alertsController.create);

routes.get('/webUsers/:user_id', webUsersController.index);
routes.post('/webUsers', webUsersController.create);

export default routes;
