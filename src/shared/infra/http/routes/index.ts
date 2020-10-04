import { Router } from 'express';

import PostsController from '../controllers/PostsController';
import PostsDataOnPeriodController from '../controllers/PostsDataOnPeriodController';

import AddressesController from '../controllers/AddressesController';
import PostsAddressesController from '../controllers/PostsAddressesController';
import TopicsController from '../controllers/TopicsController';
import AddressAuthorsController from '../controllers/AddressAuthorsController';
import PostsHistoryController from '../controllers/PostsHistoryController';
import BoardsController from '../controllers/BoardsController';

import UserPostsBoardsController from '../controllers/UserPostsBoardsController';
import UserPostsPeriodsController from '../controllers/UserPostsPeriodsController';
import UserMeritsCountController from '../controllers/UserMeritsCountController';
import UserAddressesController from '../controllers/UserAddressesController';
import UserInfoController from '../controllers/UserInfoController';

import AlertsController from '../controllers/AlertsController';

const routes = Router();

const postsController = new PostsController();
const addressesController = new AddressesController();
const postsAddressesController = new PostsAddressesController();
const topicsController = new TopicsController();
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

routes.get('/posts', postsController.index);
routes.get('/posts/history', postsHistoryController.index);
routes.get('/posts/count', postsDataOnPeriodController.show);
routes.get('/posts/topic/:id', topicsController.show);
routes.get('/posts/:ids', postsController.show);
routes.get('/posts/:id/history', postsHistoryController.show);

routes.get('/addresses/post/:id', postsAddressesController.show);
routes.get('/addresses', addressesController.index);
routes.get('/addresses/:address', addressesController.show);
routes.get('/addresses/:address/authors', addressAuthorsController.show);

routes.get('/users/:username', userInfoController.show);
routes.get('/users/:username/boards', userPostsBoardsController.show);
routes.get('/users/:username/posts', userPostsPeriodsController.show);
routes.get('/users/:username/merits', userMeritsCountController.show);
routes.get('/users/:username/addresses', userAddressesController.show);

routes.get('/boards', boardsController.index);

routes.get('/alerts', alertsController.show);
routes.post('/alerts', alertsController.create);

export default routes;
