const mongoose = require('mongoose');

const autoTriggerConfigSchema = new mongoose.Schema(
  {
    triggerKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    systemEventTrigger: {
      type: String,
      required: true,
      trim: true,
    },
    recipientPortal: {
      type: String,
      required: true,
      trim: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    totalEmailsSent: {
      type: Number,
      default: 0,
    },
    lastExecuted: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const AutoTriggerConfig = mongoose.model('AutoTriggerConfig', autoTriggerConfigSchema);

module.exports = AutoTriggerConfig;
