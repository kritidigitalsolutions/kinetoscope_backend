const ServiceRequest = require('../../models/ServiceRequest.model');
const User = require('../../models/User.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const { uploadBufferToCloudinary } = require('../../services/cloudinary.service');
const { sendEmail } = require('../../services/email.service');
const { ROLES } = require('../../constants/roles');

// Mock seeding logic disabled by request

/**
 * Create a new Service Request (Agents / Clients)
 * POST /api/super-admin/service-requests
 */
const createServiceRequest = asyncHandler(async (req, res, next) => {
  const { category, subject, description } = req.body;

  let attachmentUrl = '';
  if (req.file) {
    try {
      console.log(`[Service Request] Uploading attachment file to Cloudinary...`);
      attachmentUrl = await uploadBufferToCloudinary(req.file.buffer);
    } catch (err) {
      return next(new AppError(`Failed to upload attachment to Cloudinary: ${err.message}`, 500));
    }
  }

  const newRequest = await ServiceRequest.create({
    createdBy: req.user.id,
    category,
    subject,
    description,
    attachment: attachmentUrl,
  });

  res.status(201).json({
    success: true,
    message: 'Service request submitted successfully.',
    data: newRequest,
  });
});

/**
 * Get Service Requests submitted by the logged-in agent/client
 * GET /api/super-admin/service-requests/my-requests
 */
const getMyServiceRequests = asyncHandler(async (req, res, next) => {

  const requests = await ServiceRequest.find({ createdBy: req.user.id })
    .sort({ createdAt: -1 })
    .lean();

  const openCount = requests.filter(r => r.status === 'OPEN').length;
  const inProgressCount = requests.filter(r => r.status === 'IN PROGRESS').length;
  const resolvedCount = requests.filter(r => r.status === 'RESOLVED').length;

  res.status(200).json({
    success: true,
    count: requests.length,
    data: {
      requests,
      stats: {
        open: openCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
      },
    },
  });
});

/**
 * Get All Service Requests (Super Admin View with Filters)
 * GET /api/super-admin/service-requests
 */
const getAllServiceRequests = asyncHandler(async (req, res, next) => {

  const { status, raiserType, startDate, endDate } = req.query;
  const query = {};

  // Filter by Status
  if (status && status !== 'All Statuses') {
    query.status = status.toUpperCase();
  }

  // Filter by Raiser Type (Client or Agent)
  if (raiserType && raiserType !== 'All Raisers') {
    const role = raiserType.toLowerCase();
    const users = await User.find({ role }).select('_id');
    const userIds = users.map(u => u._id);
    query.createdBy = { $in: userIds };
  }

  // Filter by Date Range
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const requests = await ServiceRequest.find(query)
    .populate('createdBy', 'name email role clientCode')
    .sort({ createdAt: -1 })
    .lean();

  // Dynamically calculate overall unresolved requests (OPEN or IN PROGRESS)
  const unresolvedCount = await ServiceRequest.countDocuments({
    status: { $in: ['OPEN', 'IN PROGRESS'] },
  });

  res.status(200).json({
    success: true,
    unresolvedCount,
    count: requests.length,
    data: {
      requests,
    },
  });
});

/**
 * Update Service Request Status / Remarks (Super Admin View)
 * PATCH /api/super-admin/service-requests/:id/status
 */
const updateServiceRequestStatus = asyncHandler(async (req, res, next) => {
  const { status, adminRemarks, notifyUser } = req.body;

  const request = await ServiceRequest.findById(req.params.id).populate('createdBy', 'name email role');
  if (!request) {
    return next(new AppError('Service request not found', 404));
  }

  const updates = {};
  if (status !== undefined) updates.status = status.toUpperCase();
  if (adminRemarks !== undefined) updates.adminRemarks = adminRemarks;

  const updatedRequest = await ServiceRequest.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('createdBy', 'name email role clientCode');

  // Trigger real email notification if requested
  if (notifyUser && request.createdBy && request.createdBy.email) {
    try {
      await sendEmail({
        to: request.createdBy.email,
        subject: `Kinetoscope – Service Request ${request.requestId} Updated`,
        text: `Hello ${request.createdBy.name},\n\nYour service request ${request.requestId} ("${request.subject}") has been updated to status: ${status}.\n\nAdmin Remarks: ${adminRemarks || 'None'}\n\n— Kinetoscope Support Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #1a1a2e; margin-bottom: 8px;">Service Request Update</h2>
            <p>Hello <strong>${request.createdBy.name}</strong>,</p>
            <p>Your service request <strong>${request.requestId}</strong> ("${request.subject}") has been updated.</p>
            <div style="margin: 20px 0; padding: 15px; background-color: #f9fafb; border-left: 4px solid #10b981;">
              <p style="margin: 0;"><strong>New Status:</strong> ${status}</p>
              <p style="margin: 8px 0 0 0;"><strong>Admin Remarks:</strong> ${adminRemarks || 'No remarks provided.'}</p>
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">If you did not expect this or have further queries, feel free to contact support.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 11px; text-align: center;">Kinetoscope Portal System</p>
          </div>
        `,
      });
      console.log(`[Service Request Notification] Sent email successfully to ${request.createdBy.email}`);
    } catch (err) {
      console.error(`[Service Request Notification] Failed to send email to ${request.createdBy.email}:`, err.message);
    }
  }

  res.status(200).json({
    success: true,
    message: 'Service request status updated successfully.',
    data: updatedRequest,
  });
});

/**
 * Get a single Service Request by ID (For Review Modal)
 * GET /api/super-admin/service-requests/:id
 */
const getServiceRequestById = asyncHandler(async (req, res, next) => {
  const request = await ServiceRequest.findById(req.params.id)
    .populate('createdBy', 'name email role clientCode');

  if (!request) {
    return next(new AppError('Service request not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      request,
    },
  });
});

/**
 * Delete a Service Request
 * DELETE /api/super-admin/service-requests/:id
 */
const deleteServiceRequest = asyncHandler(async (req, res, next) => {
  const request = await ServiceRequest.findById(req.params.id);
  if (!request) {
    return next(new AppError('Service request not found', 404));
  }

  await ServiceRequest.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Service request deleted successfully.',
  });
});

module.exports = {
  createServiceRequest,
  getMyServiceRequests,
  getAllServiceRequests,
  getServiceRequestById,
  updateServiceRequestStatus,
  deleteServiceRequest,
};
