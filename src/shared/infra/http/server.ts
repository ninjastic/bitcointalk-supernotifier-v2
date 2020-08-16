import http from 'http';
import express, { Express } from 'express';
import socket from 'socket.io';

class Server {
  app: Express;

  server: http.Server;

  socket: socket.Server;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.socket = socket.listen(this.server);
    this.init();
  }

  init() {
    this.server.listen(3333);
  }
}

export default new Server();
