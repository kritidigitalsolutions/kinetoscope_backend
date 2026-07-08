const mongoose = require('mongoose');

/**
 * DividendPool Schema representing general or specific pools of dividends to distribute.
 */
const dividendPoolSchema = new mongoose.Schema(
  {
    poolAmount: {
      type: Number,
      required: [true, 'Pool amount is required'],
      min: [0.01, 'Pool amount must be a positive number'],
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: false,
    },
    name: {
      type: String,
      default: 'General Pool',
      trim: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Pool creator is required'],
    },
  },
  {
    timestamps: true,
  }
);

const DividendPool = mongoose.model('DividendPool', dividendPoolSchema);

module.exports = DividendPool;
