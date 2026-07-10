const mongoose = require('mongoose');

/**
 * Segment Schema representing projects segments and their configurable statuses.
 */
const segmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Segment name is required'],
      unique: true,
      trim: true,
    },
    statuses: {
      type: [String],
      required: [true, 'Statuses list is required'],
      default: ['Planning', 'Active', 'Ongoing', 'Completed'],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Segment creator is required'],
    },
  },
  {
    timestamps: true,
  }
);

const Segment = mongoose.model('Segment', segmentSchema);

module.exports = Segment;
