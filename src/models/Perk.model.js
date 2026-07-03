const mongoose = require('mongoose');

/**
 * Perk Schema representing rewards and benefits available to clients.
 */
const perkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Perk title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Perk description is required'],
      trim: true,
    },
    tier: {
      type: String,
      enum: {
        values: ['DIAMOND', 'PLATINUM', 'GOLD', 'SILVER'],
        message: 'Tier must be either DIAMOND, PLATINUM, GOLD, or SILVER',
      },
      default: 'SILVER',
    },
    minInvestment: {
      type: Number,
      default: 0,
      min: [0, 'Minimum investment must be a non-negative number'],
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: 'Status must be either active or inactive',
      },
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup
perkSchema.index({ status: 1 });
perkSchema.index({ tier: 1 });

const Perk = mongoose.model('Perk', perkSchema);

module.exports = Perk;
