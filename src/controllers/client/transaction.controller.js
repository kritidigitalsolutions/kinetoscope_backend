const Transaction = require('../../models/Transaction.model');
const User = require('../../models/User.model');
const { sendTransactionRequestAlertToAdmin } = require('../../services/email.service');
const { TRANSACTION_STATUS, TRANSACTION_TYPES } = require('../../constants/statuses');
const { ROLES } = require('../../constants/roles');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Request a deposit or withdrawal transaction (Client portal)
 * POST /api/client/transactions
 */
const requestTransaction = asyncHandler(async (req, res, next) => {
  const { type, amount, paymentMethod, referenceNumber, remarks } = req.body;

  // Basic validation
  if (!type || !amount) {
    return next(new AppError('Transaction type and amount are required.', 400));
  }

  if (![TRANSACTION_TYPES.DEPOSIT, TRANSACTION_TYPES.WITHDRAWAL].includes(type)) {
    return next(new AppError('Transaction type must be either deposit or withdrawal.', 400));
  }

  if (amount <= 0) {
    return next(new AppError('Amount must be greater than zero.', 400));
  }

  // Create transaction document
  const transaction = await Transaction.create({
    clientId: req.user._id,
    clientName: req.user.name,
    clientCode: req.user.clientCode,
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
        req.user.name,
        req.user.clientCode,
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
 * Get client's transaction history (Client portal)
 * GET /api/client/transactions
 */
const getClientTransactions = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = { clientId: req.user._id };

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
  requestTransaction,
  getClientTransactions,
};
