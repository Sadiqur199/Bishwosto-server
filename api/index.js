import app from '../src/app.js';
import { assertProductionEnv } from '../src/config/env.js';
import { connectDB, isDbConnected } from '../src/config/db.js';
import { initFirebase } from '../src/config/firebase.js';

assertProductionEnv();
initFirebase();

let connectionPromise;

export default async function handler(req, res) {
  if (!isDbConnected()) {
    if (!connectionPromise) {
      connectionPromise = connectDB().finally(() => {
        connectionPromise = undefined;
      });
    }
    await connectionPromise;
  }

  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  return app(req, res);
}