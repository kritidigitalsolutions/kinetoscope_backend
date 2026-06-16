const mongoose = require('mongoose');

/**
 * Investment Schema
 * Financial records are immutable — no update or delete operations are permitted.
 */
const investmentSchema = new mongoose.Schema(
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
    segment: {
      type: String,
      required: [true, 'Segment is required'],
      trim: true,
    },
    investmentAmount: {
      type: Number,
      required: [true, 'Investment amount is required'],
      min: [0.01, 'Investment amount must be a positive number'],
    },
    roiPercentage: {
      type: Number,
      required: [true, 'ROI percentage is required'],
      min: [0, 'ROI percentage must be a non-negative number'],
    },
    riskPercentage: {
      type: Number,
      required: [true, 'Risk percentage is required'],
      min: [0, 'Risk percentage must be a non-negative number'],
    },
    investmentDate: {
      type: Date,
      required: [true, 'Investment date is required'],
      default: Date.now,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'completed', 'cancelled'],
        message: 'Status must be either: active, completed, or cancelled',
      },
      default: 'active',
    },
    remarks: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Investment must be assigned by a user'],
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt fields
  }
);

// Indexes for efficient search and filter queries
investmentSchema.index({ clientName: 1 });
investmentSchema.index({ clientCode: 1 });
investmentSchema.index({ segment: 1 });
investmentSchema.index({ status: 1 });
investmentSchema.index({ clientId: 1 });

const Investment = mongoose.model('Investment', investmentSchema);

module.exports = Investment;
