import { Router } from 'express';

import PostSearchController from '../controllers/PostSearchController';

const routes = Router();

const postSearchController = new PostSearchController();

routes.get('/posts/search', postSearchController.show);

export default routes;
