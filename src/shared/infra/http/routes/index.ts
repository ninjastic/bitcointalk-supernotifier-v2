import { Router } from 'express';

import ReportsController from '../controllers/ReportsController';
import PostsController from '../controllers/PostsController';
import AddressesController from '../controllers/AddressesController';
import PostsAddressesController from '../controllers/PostsAddressesController';
import TopicsController from '../controllers/TopicsController';
import AddressAuthorsController from '../controllers/AddressAuthorsController';
import PostsHistoryController from '../controllers/PostsHistoryController';
import BoardsController from '../controllers/BoardsController';
import UserPostsDataController from '../controllers/UserPostsDataController';
import UserPostsPeriodController from '../controllers/UserPostsPeriodController';
import UserMeritsCountController from '../controllers/UserMeritsCountController';
import UserAddressesController from '../controllers/UserAddressesController';
import PostsDataOnPeriodController from '../controllers/PostsDataOnPeriodController';

const routes = Router();

const postsController = new PostsController();
const reportsController = new ReportsController();
const addressesController = new AddressesController();
const postsAddressesController = new PostsAddressesController();
const topicsController = new TopicsController();
const addressAuthorsController = new AddressAuthorsController();
const postsHistoryController = new PostsHistoryController();
const boardsController = new BoardsController();
const userPostsDataController = new UserPostsDataController();
const userPostsPeriodController = new UserPostsPeriodController();
const userMeritsCountController = new UserMeritsCountController();
const userAddressesController = new UserAddressesController();
const postsDataOnPeriodController = new PostsDataOnPeriodController();

routes.get('/posts', postsController.index);
routes.get('/posts/history', postsHistoryController.index);
routes.get('/posts/count', postsDataOnPeriodController.show);
routes.get('/posts/topic/:id', topicsController.show);
routes.get('/posts/:ids', postsController.show);
routes.get('/posts/:id/history', postsHistoryController.show);

routes.get('/reports', reportsController.index);

routes.get('/addresses/post/:id', postsAddressesController.show);
routes.get('/addresses', addressesController.index);
routes.get('/addresses/:address', addressesController.show);
routes.get('/addresses/:address/authors', addressAuthorsController.show);

routes.get('/users/:username', userPostsDataController.show);
routes.get('/users/:username/posts', userPostsPeriodController.show);
routes.get('/users/:username/merits', userMeritsCountController.show);
routes.get('/users/:username/addresses', userAddressesController.show);

routes.get('/boards', boardsController.index);

export default routes;
