import dns from 'node:dns';
import mongoose from 'mongoose';
import { env, features } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Connect to MongoDB Atlas.
 * If MONGO_URI is not configured we do NOT crash: the API keeps serving and
 * DB-dependent routes return a clear 503 so the frontend can still be developed.
 */
export async function connectDB() {
  if (!features.mongoConfigured) {
    logger.warn('Skipping MongoDB connection (MONGO_URI not set). See server/.env.example');
    return false;
  }

  mongoose.set('strictQuery', true);

  // Apply the optional DNS override before resolving the mongodb+srv SRV record.
  if (env.dnsServers.length) {
    try {
      dns.setServers(env.dnsServers);
      logger.info(`Using DNS servers: ${env.dnsServers.join(', ')}`);
    } catch (err) {
      logger.warn(`Could not set DNS servers: ${err.message}`);
    }
  }

  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
    });
    logger.success(`MongoDB connected -> ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
    mongoose.connection.on('reconnected', () => logger.success('MongoDB reconnected'));

    return true;
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    logger.warn('API will keep running; fix MONGO_URI in server/.env and restart.');
    return false;
  }
}

/** True when the mongoose connection is up. */
export const isDbConnected = () => mongoose.connection.readyState === 1;
