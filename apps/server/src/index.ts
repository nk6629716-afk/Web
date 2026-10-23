import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { createServer } from './server';
import { setupSocketIO } from './sockets';
import { getRepositories } from '@relay/database';

import { isOriginAllowed } from './corsConfig';

dotenv.config();

const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST || '0.0.0.0';
const repos = getRepositories();

const app = createServer(repos);
const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      callback(null, isOriginAllowed(origin));
    },
    methods: ['GET', 'POST', 'PUT'],
    credentials: true
  }
});

setupSocketIO(io, repos);

httpServer.listen(port, host, () => {
  console.log(`===============================================`);
  console.log(`🚀 RELAY API & Realtime Server`);
  console.log(`📡 Listening at http://${host}:${port}`);
  console.log(`🩺 Health check: http://localhost:${port}/api/health`);
  console.log(`===============================================`);
});

export { app, httpServer, io };
