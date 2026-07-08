const mongoose = require('mongoose');

/**
 * AgentOverride Schema
 * Stores special commission rate overrides configured for specific agents.
 */
const agentOverrideSchema = new mongoose.Schema(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Agent is required'],
    },
    commissionOverride: {
      type: Number,
      required: [true, 'Special commission override percentage is required'],
      min: [0, 'Override percentage cannot be negative'],
    },
    reason: {
      type: String,
      required: [true, 'Reason for the manual override is required'],
      trim: true,
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

// Index for quick queries
agentOverrideSchema.index({ agentId: 1 });

const AgentOverride = mongoose.model('AgentOverride', agentOverrideSchema);

module.exports = AgentOverride;
