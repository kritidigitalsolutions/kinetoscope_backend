const mongoose = require('mongoose');
const { TRANSACTION_STATUS, TRANSACTION_TYPES } = require('../constants/statuses');

/**
 * Transaction Schema
 * Stores deposits and withdrawals initiated by clients or agents on behalf of clients.
 */
const transactionSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Client ID is required'],
    },
    clientName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
    },
    clientCode: {
      type: String,
      required: [true, 'Client code is required'],
      trim: true,
      uppercase: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // If submitted by an agent on behalf of the client
    },
    type: {
      type: String,
      enum: {
        values: [TRANSACTION_TYPES.DEPOSIT, TRANSACTION_TYPES.WITHDRAWAL],
        message: 'Type must be either deposit or withdrawal',
      },
      required: [true, 'Transaction type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    status: {
      type: String,
      enum: {
        values: [TRANSACTION_STATUS.PENDING, TRANSACTION_STATUS.APPROVED, TRANSACTION_STATUS.REJECTED],
        message: 'Status must be pending, approved, or rejected',
      },
      default: TRANSACTION_STATUS.PENDING,
    },
    paymentMethod: {
      type: String,
      trim: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    actionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // The Super Admin who approved/rejected this transaction
    },
    actionAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast searching and sorting
transactionSchema.index({ clientId: 1 });
transactionSchema.index({ clientCode: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
