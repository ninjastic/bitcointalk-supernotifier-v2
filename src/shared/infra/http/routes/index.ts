import { Router } from 'express';

import postsRouter from './postsRouter';
import addressesRouter from './addressesRouter';
import usersRouter from './usersRouter';
import webUsersRouter from './webUsersRouter';
import alertsRouter from './alertsRouter';
import boardsRouter from './boardsRouter';
import notFoundRouter from './notFoundRouter';

const routes = Router();

routes.use('/posts', postsRouter);
routes.use('/addresses', addressesRouter);
routes.use('/users', usersRouter);
routes.use('/webUsers', webUsersRouter);
routes.use('/boards', boardsRouter);
routes.use('/alerts', alertsRouter);

routes.use(notFoundRouter);

export default routes;
