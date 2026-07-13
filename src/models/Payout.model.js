const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema(
  {
    recipientType: {
      type: String,
      required: [true, 'Recipient type is required'],
      enum: ['Client Return (ROI)', 'Agent Commission', 'CLIENT', 'AGENT']
    },
    recipientId: {
      type: String,
      required: [true, 'Recipient ID is required']
    },
    commissionType: {
      type: String,
      enum: ['Monthly', 'One-Time', 'Special', ''],
      default: ''
    },
    clientId: {
      type: String,
      default: ''
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be non-negative']
    },
    payoutDate: {
      type: String, // YYYY-MM-DD
      required: [true, 'Payout date is required']
    },
    paymentMode: {
      type: String,
      default: ''
    },
    transactionRefId: {
      type: String,
      unique: true,
      sparse: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending'
    },
    paidAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

payoutSchema.index({ recipientId: 1 });
payoutSchema.index({ status: 1 });

const Payout = mongoose.model('Payout', payoutSchema);

module.exports = Payout;
