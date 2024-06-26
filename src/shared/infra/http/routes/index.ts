import { Router } from 'express';

import postsRouter from './postsRouter';
import addressesRouter from './addressesRouter';
import usersRouter from './usersRouter';
import alertsRouter from './alertsRouter';
import boardsRouter from './boardsRouter';
import meritsRouter from './meritsRouter';
import notFoundRouter from './notFoundRouter';
import bpipRouter from './bpipRouter';
import metaRouter from './metaRouter';
import notificationRouter from './notificationRouter';

const routes = Router();

routes.use('/posts', postsRouter);
routes.use('/addresses', addressesRouter);
routes.use('/users', usersRouter);
routes.use('/boards', boardsRouter);
routes.use('/alerts', alertsRouter);
routes.use('/merits', meritsRouter);
routes.use('/bpip', bpipRouter);
routes.use('/meta', metaRouter);
routes.use('/notification', notificationRouter);

routes.use(notFoundRouter);

export default routes;
