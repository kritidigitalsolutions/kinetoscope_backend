const mongoose = require('mongoose');

const scheduledEmailSchema = new mongoose.Schema(
  {
    recipientEmails: {
      type: [String],
      default: [],
    },
    recipientIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    roles: {
      type: [String],
      default: [],
    },
    subject: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    html: {
      type: String,
    },
    templateType: {
      type: String,
      default: 'blank',
    },
    attachments: [
      {
        filename: String,
        path: String,
        contentType: String,
      },
    ],
    sendAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },
    error: {
      type: String,
    },
    sentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

scheduledEmailSchema.index({ status: 1, sendAt: 1 });

const ScheduledEmail = mongoose.model('ScheduledEmail', scheduledEmailSchema);

module.exports = ScheduledEmail;
