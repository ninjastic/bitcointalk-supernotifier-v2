import 'reflect-metadata';
import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createConnection } from 'typeorm';

import '../../container';

import loggerHttp from './middlewares/loggerHttp';
import rateLimiter from './middlewares/rateLimiter';

import routes from './routes';

class Server {
  app: Express;

  constructor() {
    this.app = express();
    this.middlewares();
    this.app.use(routes);

    createConnection().then(() => {
      this.app.listen(3333);
    });
  }

  middlewares() {
    this.app.use(helmet());
    this.app.use(bodyParser.json());
    this.app.use(cors());
    this.app.use(rateLimiter);

    if (process.env.NODE_ENV !== 'development') {
      this.app.use(loggerHttp);
    }
  }
}

export default new Server();
