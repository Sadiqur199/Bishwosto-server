import mongoose from 'mongoose';

export const REPORT_TARGETS = ['worker', 'review', 'wrong_number'];
export const REPORT_STATUS = ['open', 'reviewing', 'resolved', 'dismissed'];

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    targetType: { type: String, enum: REPORT_TARGETS, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    reason: { type: String, trim: true, required: true, maxlength: 500 },
    status: { type: String, enum: REPORT_STATUS, default: 'open', index: true },
    adminNote: { type: String, trim: true, default: '' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'reports' }
);

const Report = mongoose.model('Report', reportSchema);
export default Report;
