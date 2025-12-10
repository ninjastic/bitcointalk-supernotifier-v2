import { Router } from 'express';

import addressesRouter from './addressesRouter';
import alertsRouter from './alertsRouter';
import boardsRouter from './boardsRouter';
import bpipRouter from './bpipRouter';
import meritsRouter from './meritsRouter';
import metaRouter from './metaRouter';
import notFoundRouter from './notFoundRouter';
import notificationRouter from './notificationRouter';
import postsRouter from './postsRouter';
import usersRouter from './usersRouter';

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
