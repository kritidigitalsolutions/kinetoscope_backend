const mongoose = require('mongoose');

/**
 * CommissionSlab Schema
 * Stores tier-based commission configurations for One-Time and Monthly recurring slabs.
 */
const commissionSlabSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: {
        values: ['one-time', 'monthly'],
        message: 'Slab type must be either one-time or monthly',
      },
      required: [true, 'Slab type is required'],
    },
    minAmount: {
      type: Number,
      required: [true, 'Minimum investment amount is required'],
      min: [0, 'Minimum amount cannot be negative'],
    },
    maxAmount: {
      type: Number,
      default: null, // null represents Unlimited/No Limit
    },
    commissionPercentage: {
      type: Number,
      required: [true, 'Commission percentage is required'],
      min: [0, 'Commission percentage cannot be negative'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick sorting and type-specific queries
commissionSlabSchema.index({ type: 1, minAmount: 1 });

const CommissionSlab = mongoose.model('CommissionSlab', commissionSlabSchema);

module.exports = CommissionSlab;
