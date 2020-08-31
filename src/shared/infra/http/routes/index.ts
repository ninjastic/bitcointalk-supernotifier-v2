import { Router } from 'express';

import ReportsController from '../controllers/ReportsController';
import PostsController from '../controllers/PostsController';
import AddressesController from '../controllers/AddressesController';
import PostsAddressesController from '../controllers/PostsAddressesController';

const routes = Router();

const postsController = new PostsController();
const reportsController = new ReportsController();
const addressesController = new AddressesController();
const postsAddressesController = new PostsAddressesController();

routes.get('/posts', postsController.index);
routes.get('/posts/:ids', postsController.show);

routes.get('/reports', reportsController.index);

routes.get('/addresses/post/:id', postsAddressesController.show);
routes.get('/addresses', addressesController.index);
routes.get('/addresses/:address', addressesController.show);

export default routes;
