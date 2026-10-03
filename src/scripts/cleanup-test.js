import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { logger } from '../utils/logger.js';

const KEEP = ['Rahima Begum', 'Rahul Mia', 'Ayesha Siddika', 'Jashim Uddin', 'Shathi Akter', 'Nazrul Islam'];

async function run() {
  await connectDB();
  if (mongoose.connection.readyState !== 1) {
    logger.error('DB not connected.');
    process.exit(1);
  }
  // Remove any worker that is not one of the 6 official demo workers.
  const res = await mongoose.connection.collection('workers').deleteMany({ name: { $nin: KEEP } });
  const total = await mongoose.connection.collection('workers').countDocuments();
  logger.success(`Deleted ${res.deletedCount} test worker(s). Remaining: ${total}.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  logger.error(err);
  process.exit(1);
});
