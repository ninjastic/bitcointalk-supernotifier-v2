import { Router } from 'express';

import postsRouter from './postsRouter';
import addressesRouter from './addressesRouter';
import usersRouter from './usersRouter';
import webUsersRouter from './webUsersRouter';
import alertsRouter from './alertsRouter';
import boardsRouter from './boardsRouter';
import meritsRouter from './meritsRouter';
import notFoundRouter from './notFoundRouter';
import bpipRouter from './bpipRouter';

import CompareUserController from '../controllers/CompareUserController';

const compareUserController = new CompareUserController();

const routes = Router();

routes.use('/posts', postsRouter);
routes.use('/addresses', addressesRouter);
routes.use('/users', usersRouter);
routes.use('/webUsers', webUsersRouter);
routes.use('/boards', boardsRouter);
routes.use('/alerts', alertsRouter);
routes.use('/merits', meritsRouter);
routes.use('/bpip', bpipRouter);
routes.get('/compare', compareUserController.index);

routes.use(notFoundRouter);

export default routes;
