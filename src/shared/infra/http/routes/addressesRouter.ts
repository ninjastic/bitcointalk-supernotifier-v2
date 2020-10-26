import { Router } from 'express';

import AddressesAuthorsController from '../controllers/AddressesAuthorsController';
import AddressesController from '../controllers/AddressesController';

const addressesController = new AddressesController();
const addressesAuthorsController = new AddressesAuthorsController();

const addressesRouter = Router();

addressesRouter.get('/', addressesController.index);
addressesRouter.get('/authors', addressesAuthorsController.index);
addressesRouter.get('/:address', addressesController.show);

export default addressesRouter;
