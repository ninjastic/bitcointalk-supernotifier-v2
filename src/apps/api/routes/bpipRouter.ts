import { Router } from 'express';

import UsersController from '../controllers/bpip/UsersController';

const usersController = new UsersController();

const bpipRouter = Router();

bpipRouter.post('/users', usersController.index);

export default bpipRouter;
