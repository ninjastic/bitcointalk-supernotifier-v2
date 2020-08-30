import { Router } from 'express';

import PostsSearchController from '../controllers/PostsSearchController';
import ReportsController from '../controllers/ReportsController';
import PostsController from '../controllers/PostsController';
import AddressesController from '../controllers/AddressesController';
import PostsAddressesController from '../controllers/PostsAddressesController';

const routes = Router();

const postsController = new PostsController();
const postsSearchController = new PostsSearchController();
const reportsController = new ReportsController();
const addressesController = new AddressesController();
const postsAddressesController = new PostsAddressesController();

routes.get('/posts/search', postsSearchController.show);
routes.get('/posts/:ids', postsController.show);
routes.get('/reports', reportsController.index);
routes.get('/addresses/post/:id', postsAddressesController.show);
routes.get('/addresses/:address', addressesController.show);

export default routes;
