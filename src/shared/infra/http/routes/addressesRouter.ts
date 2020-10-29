import { Router } from 'express';

import AddressesAuthorsController from '../controllers/AddressesAuthorsController';
import AddressesController from '../controllers/AddressesController';
import AddressesUniqueController from '../controllers/AddressesUniqueController';

const addressesController = new AddressesController();
const addressesAuthorsController = new AddressesAuthorsController();
const addressesUniqueController = new AddressesUniqueController();
const addressesRouter = Router();

addressesRouter.get('/', addressesController.index);
addressesRouter.get('/authors', addressesAuthorsController.index);
addressesRouter.get('/unique', addressesUniqueController.index);
addressesRouter.get('/:address', addressesController.show);

export default addressesRouter;
