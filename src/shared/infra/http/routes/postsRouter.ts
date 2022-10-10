import { Router } from 'express';

import PostsController from '../controllers/PostsController';
import PostsCountPeriodController from '../controllers/PostsCountPeriodController';
import PostsAuthorsController from '../controllers/PostsAuthorsController';
import PostsHistoryController from '../controllers/PostsHistoryController';
import PostsTopicsPeriodController from '../controllers/PostsTopicsPeriodController';
import PostsTopTopicsPeriodController from '../controllers/PostsTopTopicsPeriodController';
import PostsAuthorsPeriodController from '../controllers/PostsAuthorsPeriodController';

const postsController = new PostsController();
const postsHistoryController = new PostsHistoryController();
const postsCountPeriodController = new PostsCountPeriodController();
const postsTopicsPeriodController = new PostsTopicsPeriodController();
const postsTopTopicsPeriodController = new PostsTopTopicsPeriodController();
const postsAuthorsPeriodController = new PostsAuthorsPeriodController();
const postsAuthorsController = new PostsAuthorsController();

const postsRouter = Router();

postsRouter.get('/', postsController.index);
postsRouter.get('/authors', postsAuthorsController.index);
postsRouter.get('/history', postsHistoryController.index);
postsRouter.get('/count', postsCountPeriodController.show);
postsRouter.get('/topics', postsTopicsPeriodController.show);
postsRouter.get('/topics/top', postsTopTopicsPeriodController.show);
postsRouter.get('/authors/top', postsAuthorsPeriodController.show);
postsRouter.get('/:id_list', postsController.show);
postsRouter.get('/:post_id/history', postsHistoryController.show);

export default postsRouter;
