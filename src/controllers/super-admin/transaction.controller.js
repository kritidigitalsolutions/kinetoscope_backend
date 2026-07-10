const Transaction = require('../../models/Transaction.model');
const User = require('../../models/User.model');
const ClientProfile = require('../../models/ClientProfile.model');
const AgentProfile = require('../../models/AgentProfile.model');
const { sendTransactionStatusNotification } = require('../../services/email.service');
const { TRANSACTION_STATUS, TRANSACTION_TYPES } = require('../../constants/statuses');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * List pending transaction approvals for Super Admin (with metrics)
 * GET /api/super-admin/transactions/approvals
 */
const getPendingApprovals = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // 1. Calculate Approvals Stats
  const allPending = await Transaction.find({ status: TRANSACTION_STATUS.PENDING }).lean();
  const pendingRequests = allPending.length;
  
  let pendingDepositsAmount = 0;
  let pendingDepositsCount = 0;
  let pendingWithdrawalsAmount = 0;
  let pendingWithdrawalsCount = 0;

  allPending.forEach(tx => {
    if (tx.type === TRANSACTION_TYPES.DEPOSIT) {
      pendingDepositsAmount += tx.amount;
      pendingDepositsCount++;
    } else if (tx.type === TRANSACTION_TYPES.WITHDRAWAL) {
      pendingWithdrawalsAmount += tx.amount;
      pendingWithdrawalsCount++;
    }
  });

  // 2. Build Query
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
    .populate('agentId', 'name email clientCode')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // Format list entries to normalize client/agent names and codes
  const formattedTransactions = transactions.map(tx => {
    const isAgent = tx.isAgentWithdrawal;
    const user = isAgent ? (tx.agentId || {}) : (tx.clientId || {});
    return {
      ...tx,
      investorName: user.name || tx.clientName || 'Unknown User',
      investorCode: isAgent ? (user.clientCode ? `AGT-${user.clientCode.replace('AGT-', '')}` : '—') : (user.clientCode || tx.clientCode || '—'),
    };
  });

  res.status(200).json({
    success: true,
    count: formattedTransactions.length,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    data: {
      stats: {
        pendingRequests,
        pendingDeposits: {
          count: pendingDepositsCount,
          totalAmount: pendingDepositsAmount
        },
        pendingWithdrawals: {
          count: pendingWithdrawalsCount,
          totalAmount: pendingWithdrawalsAmount
        }
      },
      transactions: formattedTransactions,
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
  transaction.actionBy = req.user.id || req.user._id;
  transaction.actionAt = new Date();
  transaction.remarks = rejectionReason || transaction.remarks || '';

  if (status === TRANSACTION_STATUS.REJECTED) {
    if (!rejectionReason) {
      return next(new AppError('Rejection reason is required when rejecting a transaction.', 400));
    }
    transaction.rejectionReason = rejectionReason;
  }

  await transaction.save();

  // Notify client or agent of the outcome via email
  try {
    const recipientUser = await User.findById(transaction.clientId || transaction.agentId);
    if (recipientUser && recipientUser.email) {
      await sendTransactionStatusNotification(
        recipientUser.email,
        recipientUser.name,
        {
          type: transaction.type,
          amount: transaction.amount,
        },
        status,
        rejectionReason || 'Processed by administrator'
      );
    }
  } catch (emailError) {
    console.error('[Transaction Notification Error] Failed to email recipient:', emailError.message);
  }

  res.status(200).json({
    success: true,
    message: `Transaction request was successfully ${status.toLowerCase()}.`,
    data: {
      transaction,
    },
  });
});

/**
 * View Approved and Rejected Transactions History
 * GET /api/super-admin/transactions/history
 */
const getApprovalsHistory = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = { status: { $in: [TRANSACTION_STATUS.APPROVED, TRANSACTION_STATUS.REJECTED] } };

  // Search filter
  const { search } = req.query;
  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    query.$or = [
      { clientName: searchRegex },
      { clientCode: searchRegex },
      { paymentMethod: searchRegex },
      { referenceNumber: searchRegex },
    ];
  }

  const total = await Transaction.countDocuments(query);
  const transactions = await Transaction.find(query)
    .populate('clientId', 'name email clientCode')
    .populate('agentId', 'name email clientCode')
    .populate('actionBy', 'name email')
    .sort({ actionAt: -1, updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const formattedHistory = transactions.map(tx => {
    const isAgent = tx.isAgentWithdrawal;
    const user = isAgent ? (tx.agentId || {}) : (tx.clientId || {});
    return {
      ...tx,
      investorName: user.name || tx.clientName || 'Unknown User',
      investorCode: isAgent ? (user.clientCode ? `AGT-${user.clientCode.replace('AGT-', '')}` : '—') : (user.clientCode || tx.clientCode || '—'),
      actionTimeFormatted: tx.actionAt ? tx.actionAt.toISOString().replace('T', ' ').substring(0, 16) : '—',
    };
  });

  res.status(200).json({
    success: true,
    count: formattedHistory.length,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    data: {
      history: formattedHistory,
    },
  });
});

/**
 * Get details of a single transaction including investor/agent profile details
 * GET /api/super-admin/transactions/:id
 */
const getTransactionById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const transaction = await Transaction.findById(id)
    .populate('clientId', 'name email clientCode')
    .populate('agentId', 'name email clientCode')
    .lean();

  if (!transaction) {
    return next(new AppError('Transaction record not found.', 404));
  }

  let profileData = null;
  if (transaction.isAgentWithdrawal) {
    const agentProfile = await AgentProfile.findOne({ userId: transaction.agentId }).lean();
    if (agentProfile) {
      profileData = {
        phone: agentProfile.phone || '—',
        panNumber: agentProfile.panNumber || '—',
        bankName: agentProfile.bankName || '—',
        accountNumber: agentProfile.accountNumber || '—',
        ifscCode: agentProfile.ifscCode || '—',
        residencyStatus: agentProfile.residencyStatus || '—',
      };
    }
  } else if (transaction.clientId) {
    const clientProfile = await ClientProfile.findOne({ userId: transaction.clientId._id || transaction.clientId }).lean();
    if (clientProfile) {
      profileData = {
        phone: clientProfile.phone || '—',
        panNumber: clientProfile.panNumber || '—',
        riskProfile: clientProfile.riskProfile || 'Moderate',
        tier: clientProfile.tier || 'Silver',
        residencyStatus: clientProfile.residencyStatus || '—',
      };
    }
  }

  res.status(200).json({
    success: true,
    data: {
      transaction: {
        ...transaction,
        investorName: transaction.isAgentWithdrawal ? (transaction.agentId ? transaction.agentId.name : 'Unknown Agent') : (transaction.clientId ? transaction.clientId.name : 'Unknown Client'),
        investorCode: transaction.isAgentWithdrawal ? (transaction.agentId ? transaction.agentId.clientCode : '—') : (transaction.clientId ? transaction.clientId.clientCode : '—'),
        investorEmail: transaction.isAgentWithdrawal ? (transaction.agentId ? transaction.agentId.email : '—') : (transaction.clientId ? transaction.clientId.email : '—'),
      },
      profile: profileData,
    },
  });
});

module.exports = {
  getPendingApprovals,
  approveRejectTransaction,
  getApprovalsHistory,
  getTransactionById,
};
