import { Router } from 'express';

import AddressesAuthorsController from '../controllers/AddressesAuthorsController';
import AddressesController from '../controllers/AddressesController';
import AddressesUniqueController from '../controllers/AddressesUniqueController';
import AddressesTopUniqueController from '../controllers/AddressesTopUniqueController';
import AddressDetailsController from '../controllers/AddressDetailsController';

const addressesController = new AddressesController();
const addressesAuthorsController = new AddressesAuthorsController();
const addressesUniqueController = new AddressesUniqueController();
const addressesTopUniqueController = new AddressesTopUniqueController();
const addressDetailsController = new AddressDetailsController();

const addressesRouter = Router();

addressesRouter.get('/', addressesController.index);
addressesRouter.get('/authors', addressesAuthorsController.index);
addressesRouter.get('/unique', addressesUniqueController.index);
addressesRouter.get('/unique/top', addressesTopUniqueController.index);
addressesRouter.get('/:address/details', addressDetailsController.show);

export default addressesRouter;
