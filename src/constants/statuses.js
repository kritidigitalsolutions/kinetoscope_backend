const TRANSACTION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const INVESTMENT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const TRANSACTION_TYPES = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  ROI_PAYOUT: 'roi-payout',
  BONUS: 'bonus',
};

module.exports = {
  TRANSACTION_STATUS,
  INVESTMENT_STATUS,
  TRANSACTION_TYPES,
};
