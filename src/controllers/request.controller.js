import WorkerRequest from '../models/WorkerRequest.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';

export async function createWorkerRequest(req, res, next) {
  try {
    const {
      clientName,
      clientPhone,
      category,
      area,
      address,
      workType,
      salaryBudget,
      specialRequirements,
    } = req.body;

    if (!clientName || !clientPhone || !category || !area) {
      throw ApiError.badRequest('Name, phone, category, and area are required.');
    }

    const workerRequest = await WorkerRequest.create({
      user: req.user?._id || null,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      category: category.trim(),
      area: area.trim(),
      address: (address || '').trim(),
      workType: workType || 'part-time',
      salaryBudget: (salaryBudget || '').trim(),
      specialRequirements: (specialRequirements || '').trim(),
      status: 'pending',
    });

    return sendSuccess(res, {
      status: 201,
      message: 'Worker request submitted successfully! Our agent will contact you soon.',
      data: { request: workerRequest },
    });
  } catch (err) {
    return next(err);
  }
}

export async function getMyRequests(req, res, next) {
  try {
    const requests = await WorkerRequest.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(res, {
      message: 'Requests retrieved.',
      data: { requests },
    });
  } catch (err) {
    return next(err);
  }
}
