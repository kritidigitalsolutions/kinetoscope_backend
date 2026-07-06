const Investment = require('../../models/Investment.model');
const User = require('../../models/User.model');
const { sendInvestmentAssignmentNotification } = require('../../services/email.service');
const { ROLES } = require('../../constants/roles');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Assign a new investment record to a client.
 * Investment records are financial records and are immutable once created.
 * POST /api/super-admin/investments
 */
const createInvestment = asyncHandler(async (req, res, next) => {
  const { clientId } = req.body;

  if (!clientId) {
    return next(new AppError('Client ID is required.', 400));
  }

  // Fetch client from database to ensure existence and grab correct name/code
  const clientUser = await User.findById(clientId);
  if (!clientUser || clientUser.role !== ROLES.CLIENT) {
    return next(new AppError('Client account not found.', 404));
  }

  const investmentData = {
    ...req.body,
    clientName: clientUser.name,
    clientCode: clientUser.clientCode,
    createdBy: req.user.id,
  };

  const investment = await Investment.create(investmentData);

  // Send automated email notification to client and their agent
  try {
    if (clientUser.email) {
      let agentEmail = null;
      if (clientUser.assignedAgent) {
        const agent = await User.findById(clientUser.assignedAgent);
        if (agent) agentEmail = agent.email;
      }

      sendInvestmentAssignmentNotification(
        clientUser.email,
        clientUser.name,
        agentEmail,
        investment
      ).catch((err) =>
        console.error('[Investment Notification Error]:', err.message)
      );
    }
  } catch (error) {
    console.error('[Investment Notification Processing Error]:', error.message);
  }

  res.status(201).json({
    success: true,
    message: 'Investment assigned successfully',
    data: {
      investment,
    },
  });
});

/**
 * Get all investment records.
 * Supports pagination, search by clientName / clientCode, filter by segment and status.
 * GET /api/super-admin/investments
 * Query Params: page, limit, clientName, clientCode, segment, status
 */
const getAllInvestments = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const queryObj = {};

  // Search by client name (case-insensitive partial match)
  if (req.query.clientName) {
    queryObj.clientName = { $regex: req.query.clientName, $options: 'i' };
  }

  // Search by client code (case-insensitive exact-ish match)
  if (req.query.clientCode) {
    queryObj.clientCode = { $regex: req.query.clientCode, $options: 'i' };
  }

  // Filter by segment
  if (req.query.segment) {
    queryObj.segment = req.query.segment;
  }

  // Filter by status
  if (req.query.status) {
    queryObj.status = req.query.status;
  }

  const total = await Investment.countDocuments(queryObj);
  const investments = await Investment.find(queryObj)
    .populate('clientId', 'name email')
    .populate('createdBy', 'name email role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    message: 'Investments retrieved successfully',
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    data: {
      investments,
    },
  });
});

/**
 * Get a single investment record by ID.
 * GET /api/super-admin/investments/:id
 */
const getInvestmentById = asyncHandler(async (req, res, next) => {
  const investment = await Investment.findById(req.params.id)
    .populate('clientId', 'name email')
    .populate('createdBy', 'name email role');

  if (!investment) {
    return next(new AppError('Investment record not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Investment retrieved successfully',
    data: {
      investment,
    },
  });
});

module.exports = {
  createInvestment,
  getAllInvestments,
  getInvestmentById,
};
