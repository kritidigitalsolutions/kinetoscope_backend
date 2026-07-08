const mongoose = require('mongoose');

/**
 * RewardsConfig Schema representing global settings for referral commissions, milestones, and withdrawals.
 */
const rewardsConfigSchema = new mongoose.Schema(
  {
    referralBonusPercentage: {
      type: Number,
      required: [true, 'Referral bonus percentage is required'],
      default: 5.0,
      min: [0, 'Percentage cannot be negative'],
    },
    milestoneAmount: {
      type: Number,
      required: [true, 'Milestone investment amount is required'],
      default: 1000000, // Default ₹10L
      min: [0, 'Amount cannot be negative'],
    },
    milestoneRewardPercentage: {
      type: Number,
      required: [true, 'Milestone reward percentage is required'],
      default: 1.0, // Default 1%
      min: [0, 'Percentage cannot be negative'],
    },
    minWithdrawalLimit: {
      type: Number,
      required: [true, 'Minimum withdrawal limit is required'],
      default: 5000, // Default ₹5,000
      min: [0, 'Limit cannot be negative'],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Updater user ref is required'],
    },
  },
  {
    timestamps: true,
  }
);

const RewardsConfig = mongoose.model('RewardsConfig', rewardsConfigSchema);

module.exports = RewardsConfig;
