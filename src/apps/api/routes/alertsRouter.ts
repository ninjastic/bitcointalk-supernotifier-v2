import { Router } from 'express';

import AlertsController from '../controllers/AlertsController';

const alertsController = new AlertsController();

const alertsRouter = Router();

alertsRouter.get('/', alertsController.show);
alertsRouter.post('/', alertsController.create);

export default alertsRouter;
