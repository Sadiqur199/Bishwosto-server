import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Worker from '../models/Worker.js';
import Pricing from '../models/Pricing.js';
import { encryptNid, nidLast4 } from '../utils/nidCrypto.js';
import { logger } from '../utils/logger.js';

const AGENT_PHONE = '+8801711111111';
const AGENT_PASSWORD = 'agent123';

const DEMO_WORKERS = [
  {
    name: 'Rahima Begum',
    gender: 'female',
    ageRange: '36-45',
    categories: ['cook', 'bua'],
    skills: ['Bangla cooking', 'Mess cooking', 'Cleaning'],
    experienceYears: 9,
    min: 8000,
    max: 12000,
    type: 'monthly',
    workType: 'full_time',
    availability: 'available',
    location: { division: 'Dhaka', district: 'Dhaka', thana: 'Mirpur', area: 'Mirpur 10' },
    contact: { phone: '01711000001', presentAddress: 'Mirpur 10, Dhaka', referenceName: 'Karim' },
    nid: '1990123456789',
    ratingAvg: 4.8,
    ratingCount: 42,
    workHistory: [{ place: 'Uttara Sector 7', role: 'Cook', fromDate: '2021', toDate: '2024' }],
  },
  {
    name: 'Rahul Mia',
    gender: 'male',
    ageRange: '26-35',
    categories: ['darowan'],
    skills: ['Security', 'Gate keeping', 'Night shift'],
    experienceYears: 6,
    min: 12000,
    max: 15000,
    type: 'monthly',
    workType: 'live_in',
    availability: 'available',
    location: { division: 'Dhaka', district: 'Dhaka', thana: 'Uttara', area: 'Uttara Sector 4' },
    contact: { phone: '01711000002', presentAddress: 'Uttara, Dhaka' },
    nid: '1988123456789',
    ratingAvg: 4.6,
    ratingCount: 18,
  },
  {
    name: 'Ayesha Siddika',
    gender: 'female',
    ageRange: '18-25',
    categories: ['caretaker'],
    skills: ['Baby sitting', 'Elder care'],
    experienceYears: 4,
    min: 10000,
    max: 14000,
    type: 'monthly',
    workType: 'full_time',
    availability: 'busy',
    location: { division: 'Dhaka', district: 'Dhaka', thana: 'Mohammadpur', area: 'Mohammadpur' },
    contact: { phone: '01711000003', presentAddress: 'Mohammadpur, Dhaka' },
    nid: '2000123456789',
    ratingAvg: 4.9,
    ratingCount: 27,
  },
  {
    name: 'Jashim Uddin',
    gender: 'male',
    ageRange: '36-45',
    categories: ['driver'],
    skills: ['Driving', 'Valid license', 'Highway'],
    experienceYears: 12,
    min: 18000,
    max: 25000,
    type: 'monthly',
    workType: 'full_time',
    availability: 'available',
    location: { division: 'Dhaka', district: 'Dhaka', thana: 'Mirpur', area: 'Mirpur 1' },
    contact: { phone: '01711000004', presentAddress: 'Mirpur 1, Dhaka' },
    nid: '1978123456789',
    ratingAvg: 4.7,
    ratingCount: 33,
  },
  {
    name: 'Shathi Akter',
    gender: 'female',
    ageRange: '26-35',
    categories: ['bua', 'cleaner'],
    skills: ['Deep cleaning', 'Bathroom cleaning', 'Ironing'],
    experienceYears: 5,
    min: 5000,
    max: 8000,
    type: 'per_visit',
    workType: 'part_time',
    availability: 'available',
    location: { division: 'Dhaka', district: 'Dhaka', thana: 'Uttara', area: 'Uttara Sector 10' },
    contact: { phone: '01711000005', presentAddress: 'Uttara, Dhaka' },
    nid: '1995123456789',
    ratingAvg: 4.5,
    ratingCount: 12,
  },
  {
    name: 'Nazrul Islam',
    gender: 'male',
    ageRange: '26-35',
    categories: ['electrician', 'plumber'],
    skills: ['Wiring', 'Leak repair', 'Fan/light fitting'],
    experienceYears: 7,
    min: 500,
    max: 1500,
    type: 'per_visit',
    workType: 'part_time',
    availability: 'available',
    location: { division: 'Dhaka', district: 'Dhaka', thana: 'Mohammadpur', area: 'Adabor' },
    contact: { phone: '01711000006', presentAddress: 'Adabor, Dhaka' },
    nid: '1993123456789',
    ratingAvg: 4.4,
    ratingCount: 9,
  },
];

async function run() {
  logger.info('Seeding GhorKaj demo data...');
  await connectDB();

  if (mongoose.connection.readyState !== 1) {
    logger.error('Database not connected. Fix MONGO_URI in server/.env first.');
    process.exit(1);
  }

  // 1) Pricing config
  await Pricing.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  logger.success('Pricing ensured.');

  // 2) Demo agent
  let agent = await User.findOne({ phone: AGENT_PHONE });
  if (!agent) {
    agent = new User({
      firebaseUid: `agent-${AGENT_PHONE.replace('+', '')}`,
      phone: AGENT_PHONE,
      name: 'Demo Agent',
      role: 'agent',
      referralCode: User.generateReferralCode(),
    });
    await agent.setPassword(AGENT_PASSWORD);
    await agent.save();
    logger.success(`Created demo agent ${AGENT_PHONE} / ${AGENT_PASSWORD}`);
  }

  // 3) Demo workers (approved + verified)
  let created = 0;
  for (const w of DEMO_WORKERS) {
    const exists = await Worker.findOne({ name: w.name, 'location.area': w.location.area });
    if (exists) continue;

    await Worker.create({
      createdBy: agent._id,
      name: w.name,
      gender: w.gender,
      ageRange: w.ageRange,
      languages: ['bangla'],
      categories: w.categories,
      skills: w.skills,
      experienceYears: w.experienceYears,
      salaryExpectation: { min: w.min, max: w.max, type: w.type },
      workType: w.workType,
      availability: w.availability,
      location: w.location,
      contact: w.contact,
      nid: {
        numberEncrypted: encryptNid(w.nid),
        numberLast4: nidLast4(w.nid),
        verifiedAt: new Date(),
        verifiedBy: agent._id,
      },
      isVerified: true,
      status: 'approved',
      consentGiven: true,
      ratingAvg: w.ratingAvg,
      ratingCount: w.ratingCount,
      unlockCount: Math.floor(Math.random() * 40),
      trustScore: 80,
      workHistory: w.workHistory || [],
    });
    created += 1;
  }

  const total = await Worker.countDocuments();
  logger.success(`Seed complete. New workers: ${created}. Total workers in DB: ${total}.`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
