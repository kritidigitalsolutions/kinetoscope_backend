const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    sentAt: {
      type: Date,
      default: Date.now,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    recipientGroup: {
      type: String,
      required: [true, 'Recipient group label is required'],
      trim: true,
    },
    targetSummary: {
      type: String,
      required: [true, 'Target summary is required'],
      trim: true,
    },
    templateName: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
    },
    attachmentsCount: {
      type: Number,
      default: 0,
    },
    recipientEmails: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

emailLogSchema.index({ sentAt: -1 });

const EmailLog = mongoose.model('EmailLog', emailLogSchema);

module.exports = EmailLog;
