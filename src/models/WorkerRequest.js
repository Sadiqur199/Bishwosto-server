import mongoose from 'mongoose';

const workerRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
    },
    clientName: { type: String, required: true, trim: true },
    clientPhone: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    address: { type: String, trim: true, default: '' },
    workType: {
      type: String,
      enum: ['full-time', 'part-time', 'live-in', 'on-demand'],
      default: 'part-time',
    },
    salaryBudget: { type: String, trim: true, default: '' },
    specialRequirements: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['pending', 'contacted', 'assigned', 'cancelled'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true, collection: 'requests' }
);

const WorkerRequest = mongoose.model('WorkerRequest', workerRequestSchema);

export default WorkerRequest;
