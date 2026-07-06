const Transaction = require('../../models/Transaction.model');
const User = require('../../models/User.model');
const { sendTransactionStatusNotification } = require('../../services/email.service');
const { TRANSACTION_STATUS, TRANSACTION_TYPES } = require('../../constants/statuses');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * List pending transaction approvals for Super Admin
 * GET /api/super-admin/transactions/approvals
 */
const getPendingApprovals = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = { status: TRANSACTION_STATUS.PENDING };

  if (req.query.type) {
    query.type = req.query.type;
  }
  if (req.query.clientCode) {
    query.clientCode = { $regex: req.query.clientCode, $options: 'i' };
  }

  const total = await Transaction.countDocuments(query);
  const transactions = await Transaction.find(query)
    .populate('clientId', 'name email clientCode')
    .populate('agentId', 'name email')
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

/**
 * Approve or Reject a transaction (Super Admin only)
 * PATCH /api/super-admin/transactions/:id/approve
 */
const approveRejectTransaction = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  if (!status || ![TRANSACTION_STATUS.APPROVED, TRANSACTION_STATUS.REJECTED].includes(status)) {
    return next(new AppError('Please provide a valid action status: approved or rejected.', 400));
  }

  const transaction = await Transaction.findById(id);
  if (!transaction) {
    return next(new AppError('Transaction record not found.', 404));
  }

  if (transaction.status !== TRANSACTION_STATUS.PENDING) {
    return next(new AppError(`This transaction has already been ${transaction.status}.`, 400));
  }

  // Update status and actions metadata
  transaction.status = status;
  transaction.actionBy = req.user._id;
  transaction.actionAt = new Date();

  if (status === TRANSACTION_STATUS.REJECTED) {
    if (!rejectionReason) {
      return next(new AppError('Rejection reason is required when rejecting a transaction.', 400));
    }
    transaction.rejectionReason = rejectionReason;
  }

  await transaction.save();

  // Notify client of the outcome via email
  try {
    const clientUser = await User.findById(transaction.clientId);
    if (clientUser && clientUser.email) {
      await sendTransactionStatusNotification(
        clientUser.email,
        clientUser.name,
        {
          type: transaction.type,
          amount: transaction.amount,
        },
        status,
        rejectionReason
      );
    }
  } catch (emailError) {
    console.error('[Transaction Notification Error] Failed to email client:', emailError.message);
  }

  res.status(200).json({
    success: true,
    message: `Transaction request was successfully ${status}.`,
    data: {
      transaction,
    },
  });
});

module.exports = {
  getPendingApprovals,
  approveRejectTransaction,
};
