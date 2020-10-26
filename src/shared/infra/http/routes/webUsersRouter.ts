import { Router } from 'express';

import WebUsersController from '../controllers/WebUsersController';

const webUsersController = new WebUsersController();

const webUsersRouter = Router();

webUsersRouter.get('/:user_id', webUsersController.index);
webUsersRouter.post('/', webUsersController.create);

export default webUsersRouter;
