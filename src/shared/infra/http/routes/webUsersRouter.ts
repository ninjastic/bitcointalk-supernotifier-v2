import { Router } from 'express';

import WebUsersController from '../controllers/WebUsersController';
import WebNotificationsController from '../controllers/WebNotificationsController';

const webUsersController = new WebUsersController();
const webNotificationsController = new WebNotificationsController();

const webUsersRouter = Router();

webUsersRouter.get('/:user_id', webNotificationsController.index);
webUsersRouter.post('/', webUsersController.create);

export default webUsersRouter;
