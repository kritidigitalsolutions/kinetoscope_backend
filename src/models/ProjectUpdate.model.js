const mongoose = require('mongoose');

/**
 * ProjectUpdate Schema representing status updates, notes, and milestones of projects
 */
const projectUpdateSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
    },
    projectName: {
      type: String,
      required: [true, 'Project Name is required'],
    },
    segment: {
      type: String,
      required: [true, 'Segment is required'],
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
    },
    progress: {
      type: Number,
      required: [true, 'Progress percentage is required'],
      min: 0,
      max: 100,
    },
    notes: {
      type: String,
      required: [true, 'Notes/update description is required'],
    },
    attachments: {
      type: [String],
      default: [],
    },
    scope: {
      type: String,
      enum: ['project', 'segment'],
      default: 'project',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
projectUpdateSchema.index({ projectId: 1 });
projectUpdateSchema.index({ segment: 1 });
projectUpdateSchema.index({ createdAt: -1 });

const ProjectUpdate = mongoose.model('ProjectUpdate', projectUpdateSchema);

module.exports = ProjectUpdate;
