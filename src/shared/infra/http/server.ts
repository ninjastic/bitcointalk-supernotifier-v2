import 'reflect-metadata';
import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';

import '../typeorm';
import '../../container';

import { loggerHttp } from '../../services/logger';
import routes from './routes';

class Server {
  app: Express;

  constructor() {
    this.app = express();
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(loggerHttp);
    this.app.use(routes);
    this.app.listen(3333);
  }
}

export default new Server();
