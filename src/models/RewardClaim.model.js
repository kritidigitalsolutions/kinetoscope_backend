const mongoose = require('mongoose');

/**
 * RewardClaim Schema representing an agent's claim request for a performance reward.
 */
const rewardClaimSchema = new mongoose.Schema(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Agent ID is required'],
    },
    rewardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PerformanceReward',
      required: [true, 'Reward ID is required'],
    },
    deliveryAddress: {
      type: String,
      required: [true, 'Delivery address is required'],
      trim: true,
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    additionalNote: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'APPROVED', 'REJECTED', 'SHIPPED', 'DELIVERED'],
        message: 'Status must be: PENDING, APPROVED, REJECTED, SHIPPED, or DELIVERED',
      },
      default: 'PENDING',
    },
    claimedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookups by agent or status
rewardClaimSchema.index({ agentId: 1 });
rewardClaimSchema.index({ status: 1 });

const RewardClaim = mongoose.model('RewardClaim', rewardClaimSchema);

module.exports = RewardClaim;
