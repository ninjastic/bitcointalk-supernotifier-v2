import { Router } from 'express';

import PostSearchController from '../controllers/PostSearchController';
import ReportsController from '../controllers/ReportsController';

const routes = Router();

const postSearchController = new PostSearchController();
const reportsController = new ReportsController();

routes.get('/posts/search', postSearchController.show);
routes.get('/reports', reportsController.index);

export default routes;
