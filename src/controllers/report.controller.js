import Report, { REPORT_TARGETS } from '../models/Report.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';

/** POST /api/reports - a logged-in user reports a worker, review or wrong number. */
export async function createReport(req, res, next) {
  try {
    const { targetType, targetId, reason } = req.body;
    if (!REPORT_TARGETS.includes(targetType)) throw ApiError.badRequest('Invalid report type.');
    if (!reason || reason.trim().length < 5) throw ApiError.badRequest('Please describe the issue.');

    const report = await Report.create({
      reporter: req.user._id,
      targetType,
      targetId: targetId || null,
      reason: reason.trim(),
    });

    return sendSuccess(res, {
      status: 201,
      message: 'Report submitted. Our team will review it.',
      data: { report },
    });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/reports/me - the current user's own reports. */
export async function getMyReports(req, res, next) {
  try {
    const reports = await Report.find({ reporter: req.user._id }).sort({ createdAt: -1 }).lean();
    return sendSuccess(res, { message: 'My reports', data: { reports } });
  } catch (err) {
    return next(err);
  }
}
