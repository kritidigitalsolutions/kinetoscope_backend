const ProjectUpdate = require('../../models/ProjectUpdate.model');
const Project = require('../../models/Project.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const { uploadBufferToCloudinary } = require('../../services/cloudinary.service');

// Import project seeder to ensure projects exist
const { seedMockProjects } = require('./project.controller');

/**
 * Seed mock status updates history to match screen designs
 */
const seedMockUpdateHistory = async (creatorId) => {
  return; // Disabled seeder
  const count = await ProjectUpdate.countDocuments();
  if (count === 0) {
    await seedMockProjects(creatorId);

    const p1 = await Project.findOne({ name: 'Project Astra' });
    const p2 = await Project.findOne({ name: 'Meridian Release' });
    const p3 = await Project.findOne({ name: 'Rhythm Series' });

    if (p1 && p2 && p3) {
      const mocks = [
        {
          projectId: p1._id,
          projectName: p1.name,
          segment: p1.segment,
          status: 'In Production',
          progress: 65,
          notes: 'Post-production phase begins next week',
          attachments: ['http://example.com/file1.pdf', 'http://example.com/file2.png'],
          createdAt: new Date('2025-04-10T10:00:00Z'),
          createdBy: creatorId,
        },
        {
          projectId: p2._id,
          projectName: p2.name,
          segment: p2.segment,
          status: 'Active',
          progress: 80,
          notes: 'Distribution across 3 states confirmed',
          attachments: [],
          createdAt: new Date('2025-04-08T10:00:00Z'),
          createdBy: creatorId,
        },
        {
          projectId: p3._id,
          projectName: p3.name,
          segment: p3.segment,
          status: 'Recording',
          progress: 40,
          notes: '4 tracks completed, 6 remaining',
          attachments: [],
          createdAt: new Date('2025-04-05T10:00:00Z'),
          createdBy: creatorId,
        },
      ];

      await ProjectUpdate.create(mocks);
      console.log('[Project Update History Seeder] Seeded 3 status updates.');
    }
  }
};

/**
 * Publish a new Project / Segment-wide Status Update
 * POST /api/super-admin/projects/:id/updates
 */
const publishProjectUpdate = asyncHandler(async (req, res, next) => {
  const { status, progress, notes, attachments, applySegmentWide } = req.body;

  const project = await Project.findById(req.params.id);
  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  const scope = applySegmentWide === true ? 'segment' : 'project';

  // 1) Save Status Update History Record
  const newUpdate = await ProjectUpdate.create({
    projectId: project._id,
    projectName: project.name,
    segment: project.segment,
    status: status || project.status,
    progress: progress !== undefined ? Number(progress) : project.milestoneProgress,
    notes: notes || '',
    attachments: attachments || [],
    scope,
    createdBy: req.user.id,
  });

  // 2) Apply updates to Project catalog
  const updates = {};
  if (status !== undefined) updates.status = status;
  if (progress !== undefined) updates.milestoneProgress = Number(progress);
  if (notes !== undefined) updates.currentUpdate = notes;

  if (scope === 'segment') {
    // Update all projects in the same segment
    await Project.updateMany(
      { segment: project.segment },
      { $set: updates }
    );
  } else {
    // Update specific project
    await Project.findByIdAndUpdate(
      project._id,
      { $set: updates }
    );
  }

  res.status(201).json({
    success: true,
    message: 'Status update published successfully',
    data: newUpdate,
  });
});

/**
 * Get Project status update history
 * GET /api/super-admin/projects/updates/history
 * Query filters: segment, search (note or project name)
 */
const getUpdateHistory = asyncHandler(async (req, res, next) => {
  const { segment, search } = req.query;
  const query = {};

  if (segment && segment !== 'All Segments') {
    query.segment = segment;
  }

  if (search) {
    query.$or = [
      { projectName: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
    ];
  }

  const history = await ProjectUpdate.find(query)
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email')
    .lean();

  res.status(200).json({
    success: true,
    count: history.length,
    data: {
      history,
    },
  });
});

/**
 * Upload single attachment for status update
 * POST /api/super-admin/projects/:id/updates/attachments
 */
const uploadUpdateAttachment = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload a file.', 400));
  }

  let fileUrl = '';
  try {
    console.log('[Project Update] Uploading update attachment file to Cloudinary...');
    fileUrl = await uploadBufferToCloudinary(req.file.buffer, 'kinetoscope/updates');
  } catch (err) {
    return next(new AppError(`Failed to upload attachment to Cloudinary: ${err.message}`, 500));
  }

  res.status(200).json({
    success: true,
    message: 'Attachment uploaded successfully',
    data: {
      url: fileUrl,
    },
  });
});

module.exports = {
  publishProjectUpdate,
  getUpdateHistory,
  uploadUpdateAttachment,
};
