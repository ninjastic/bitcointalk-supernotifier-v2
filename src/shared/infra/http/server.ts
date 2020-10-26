import 'reflect-metadata';
import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';

import '../typeorm';
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
    this.exceptionHandler();
    this.app.listen(3333);
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

  exceptionHandler() {
    this.app.use((error, req, res, next) => {
      console.log('abc');
      return res.status(500).json({ error: error.toString() });
    });
  }
}

export default new Server();
