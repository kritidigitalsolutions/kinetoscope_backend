const Transaction = require('../../models/Transaction.model');
const User = require('../../models/User.model');
const { sendTransactionRequestAlertToAdmin } = require('../../services/email.service');
const { TRANSACTION_STATUS, TRANSACTION_TYPES } = require('../../constants/statuses');
const { ROLES } = require('../../constants/roles');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Request a transaction on behalf of an assigned client (Agent portal)
 * POST /api/agent/transactions
 */
const requestAgentTransaction = asyncHandler(async (req, res, next) => {
  const { clientId, type, amount, paymentMethod, referenceNumber, remarks } = req.body;

  if (!clientId || !type || !amount) {
    return next(new AppError('Client ID, transaction type, and amount are required.', 400));
  }

  if (![TRANSACTION_TYPES.DEPOSIT, TRANSACTION_TYPES.WITHDRAWAL].includes(type)) {
    return next(new AppError('Transaction type must be either deposit or withdrawal.', 400));
  }

  if (amount <= 0) {
    return next(new AppError('Amount must be greater than zero.', 400));
  }

  // Verify that the client exists and is assigned to the requesting agent
  const clientUser = await User.findById(clientId);
  if (!clientUser || clientUser.role !== ROLES.CLIENT) {
    return next(new AppError('Client not found.', 404));
  }

  if (!clientUser.assignedAgent || clientUser.assignedAgent.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have authorization to request transactions for this client.', 403));
  }

  // Create transaction document
  const transaction = await Transaction.create({
    clientId: clientUser._id,
    clientName: clientUser.name,
    clientCode: clientUser.clientCode,
    agentId: req.user._id,
    type,
    amount,
    paymentMethod,
    referenceNumber,
    remarks,
    status: TRANSACTION_STATUS.PENDING,
  });

  // Notify all active Super Admins via email
  try {
    const superAdmins = await User.find({ role: ROLES.SUPER_ADMIN, isActive: true });
    const superAdminEmails = superAdmins.map((admin) => admin.email);

    if (superAdminEmails.length > 0) {
      await sendTransactionRequestAlertToAdmin(
        superAdminEmails,
        clientUser.name,
        clientUser.clientCode,
        {
          type,
          amount,
          paymentMethod,
          referenceNumber,
        }
      );
    }
  } catch (emailError) {
    console.error('[Transaction Notification Error] Failed to email super admins:', emailError.message);
  }

  res.status(201).json({
    success: true,
    message: `${type.charAt(0).toUpperCase() + type.slice(1)} request submitted successfully.`,
    data: {
      transaction,
    },
  });
});

/**
 * Get transactions of clients assigned to the agent (Agent portal)
 * GET /api/agent/transactions
 */
const getAgentTransactions = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Find all client IDs assigned to this agent
  const clients = await User.find({ role: ROLES.CLIENT, assignedAgent: req.user._id }, { _id: 1 });
  const clientIds = clients.map((c) => c._id);

  if (clientIds.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      pagination: {
        total: 0,
        page,
        limit,
        totalPages: 0,
      },
      data: {
        transactions: [],
      },
    });
  }

  const query = { clientId: { $in: clientIds } };

  if (req.query.type) {
    query.type = req.query.type;
  }
  if (req.query.status) {
    query.status = req.query.status;
  }

  const total = await Transaction.countDocuments(query);
  const transactions = await Transaction.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    count: transactions.length,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    data: {
      transactions,
    },
  });
});

module.exports = {
  requestAgentTransaction,
  getAgentTransactions,
};
