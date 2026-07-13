const mongoose = require('mongoose');

/**
 * FAQ Schema definition.
 * Supports categorization for role-based dashboard views.
 */
const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Question prompt is required'],
      trim: true,
    },
    answer: {
      type: String,
      required: [true, 'Detailed answer is required'],
      trim: true,
    },
    targetPortal: {
      type: String,
      required: [true, 'Target portal channel is required'],
      enum: {
        values: [
          'Both Portals (Client & Agent)',
          'Client Dashboard Only',
          'Agent Dashboard Only',
          'both',
          'client',
          'agent'
        ],
        message: 'Invalid target portal channel specified',
      },
      default: 'Both Portals (Client & Agent)',
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast queries
faqSchema.index({ targetPortal: 1 });

const Faq = mongoose.model('Faq', faqSchema);

module.exports = Faq;
