const mongoose = require('mongoose');

/**
 * DividendAllotment Schema representing individual allotments of dividends to clients.
 */
const dividendAllotmentSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Client ID is required'],
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
    },
    allottedAmount: {
      type: Number,
      required: [true, 'Allotted amount is required'],
      min: [0.01, 'Allotted amount must be a positive number'],
    },
    allotmentDate: {
      type: Date,
      default: Date.now,
      required: [true, 'Allotment date is required'],
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Allotment creator is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
dividendAllotmentSchema.index({ clientId: 1 });
dividendAllotmentSchema.index({ projectId: 1 });
dividendAllotmentSchema.index({ allotmentDate: -1 });

const DividendAllotment = mongoose.model('DividendAllotment', dividendAllotmentSchema);

module.exports = DividendAllotment;
