const mongoose = require('mongoose');

/**
 * PerformanceReward Schema representing Agent performance-linked reward definitions.
 */
const performanceRewardSchema = new mongoose.Schema(
  {
    targetMetricType: {
      type: String,
      required: [true, 'Target metric type is required'],
      enum: {
        values: ['Clients Count', 'Investment Volume (₹)'],
        message: 'Metric type must be either: Clients Count or Investment Volume (₹)',
      },
    },
    targetThresholdValue: {
      type: String,
      required: [true, 'Target threshold value is required'],
      trim: true,
    },
    targetLimitDays: {
      type: String,
      default: '',
      trim: true,
    },
    targetLimitMonths: {
      type: String,
      default: '',
      trim: true,
    },
    targetMilestoneDescription: {
      type: String,
      required: [true, 'Target milestone description is required'],
      trim: true,
    },
    rewardDescription: {
      type: String,
      required: [true, 'Reward description is required'],
      trim: true,
    },
    rewardImage: {
      type: String,
      default: '',
    },
    rewardVideo: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
performanceRewardSchema.index({ targetMetricType: 1 });
performanceRewardSchema.index({ isActive: 1 });

const PerformanceReward = mongoose.model('PerformanceReward', performanceRewardSchema);

module.exports = PerformanceReward;
