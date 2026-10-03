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
  // Remove test accounts created during verification (keep super admin + demo agent).
  const TEST_PHONES = ['+8801777777777', '+8801766666666', '+8801755550001'];
  const users = await mongoose.connection
    .collection('users')
    .deleteMany({ phone: { $in: TEST_PHONES } });
  logger.info(`Deleted ${users.deletedCount} test account(s).`);

  // Remove test reviews / reports / requests.
  const reviews = await mongoose.connection.collection('reviews').deleteMany({});
  const reports = await mongoose.connection.collection('reports').deleteMany({});
  const requests = await mongoose.connection.collection('requests').deleteMany({});
  logger.info(
    `Deleted ${reviews.deletedCount} review(s), ${reports.deletedCount} report(s), ${requests.deletedCount} request(s).`
  );
  const total = await mongoose.connection.collection('workers').countDocuments();
  logger.success(`Deleted ${res.deletedCount} test worker(s). Remaining: ${total}.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  logger.error(err);
  process.exit(1);
});
