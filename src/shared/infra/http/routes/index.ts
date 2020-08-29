import { Router } from 'express';

import PostSearchController from '../controllers/PostSearchController';
import ReportsController from '../controllers/ReportsController';
import PostController from '../controllers/PostController';

const routes = Router();

const postController = new PostController();
const postSearchController = new PostSearchController();
const reportsController = new ReportsController();

routes.get('/posts/search', postSearchController.show);
routes.get('/posts/:id', postController.show);
routes.get('/reports', reportsController.index);

export default routes;
