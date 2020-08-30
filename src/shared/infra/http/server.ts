import 'reflect-metadata';
import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import '../typeorm';
import '../../container';

import { loggerHttp } from '../../services/logger';
import routes from './routes';

class Server {
  app: Express;

  constructor() {
    this.app = express();
    this.middlewares();
    this.app.listen(3333);
  }

  middlewares() {
    this.app.use(helmet());

    const whitelist = ['https://ninjastic.design', 'https://ninjastic.space'];
    const corsOptions = {
      origin(origin, callback) {
        if (
          whitelist.indexOf(origin) !== -1 ||
          process.env.NODE_ENV === 'development'
        ) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
    };

    this.app.use(cors(corsOptions));

    const limiter = rateLimit({
      windowMs: 1 * 60 * 1000,
      max: 60,
    });

    this.app.use(limiter);
    this.app.use(loggerHttp);
    this.app.use(routes);
  }
}

export default new Server();
