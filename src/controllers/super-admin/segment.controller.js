const Segment = require('../../models/Segment.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Seed standard segments if collection is empty
 */
const seedMockSegments = async (creatorId) => {
  const count = await Segment.countDocuments();
  if (count > 0) return;

  const mockSegments = [
    {
      name: 'Film Making',
      statuses: ['Planning', 'In Production', 'Active', 'Ongoing', 'Completed'],
      createdBy: creatorId,
    },
    {
      name: 'Distribution',
      statuses: ['Planning', 'Active', 'Ongoing', 'Negotiation', 'Completed'],
      createdBy: creatorId,
    },
    {
      name: 'Music',
      statuses: ['Planning', 'Recording', 'Active', 'Ongoing', 'Completed', 'Released'],
      createdBy: creatorId,
    },
    {
      name: 'Trading & Syndication',
      statuses: ['Planning', 'Active', 'Ongoing', 'Completed'],
      createdBy: creatorId,
    },
    {
      name: 'Content IP Bank',
      statuses: ['Planning', 'Active', 'Ongoing', 'Completed'],
      createdBy: creatorId,
    },
    {
      name: 'Film Exhibition',
      statuses: ['Planning', 'Active', 'Ongoing', 'Completed'],
      createdBy: creatorId,
    },
  ];

  await Segment.create(mockSegments);
  console.log('[Segment Seeder] Successfully seeded standard segments.');
};

/**
 * Get all segments (Super Admin)
 * GET /api/super-admin/segments
 */
const getAllSegments = asyncHandler(async (req, res, next) => {
  // Auto-seed mock segments if none exist
  await seedMockSegments(req.user.id);

  const segments = await Segment.find().sort({ createdAt: 1 }).lean();

  res.status(200).json({
    success: true,
    count: segments.length,
    data: {
      segments,
    },
  });
});

/**
 * Create a new segment (Super Admin)
 * POST /api/super-admin/segments
 */
const createSegment = asyncHandler(async (req, res, next) => {
  const { name, statuses } = req.body;

  // Check unique segment name manually for explicit clean error handling
  const existing = await Segment.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
  if (existing) {
    return next(new AppError('A segment with this name already exists', 400));
  }

  const segment = await Segment.create({
    name: name.trim(),
    statuses: statuses || ['Planning', 'Active', 'Ongoing', 'Completed'],
    createdBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: 'Segment created successfully',
    data: segment,
  });
});

/**
 * Update segment name/statuses (Super Admin)
 * PATCH /api/super-admin/segments/:id
 */
const updateSegment = asyncHandler(async (req, res, next) => {
  const { name, statuses } = req.body;

  const segment = await Segment.findById(req.params.id);
  if (!segment) {
    return next(new AppError('Segment not found', 404));
  }

  if (name) {
    const existing = await Segment.findOne({
      _id: { $ne: req.params.id },
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });
    if (existing) {
      return next(new AppError('A segment with this name already exists', 400));
    }
    segment.name = name.trim();
  }

  if (statuses) {
    segment.statuses = statuses;
  }

  await segment.save();

  res.status(200).json({
    success: true,
    message: 'Segment updated successfully',
    data: segment,
  });
});

/**
 * Delete a segment (Super Admin)
 * DELETE /api/super-admin/segments/:id
 */
const deleteSegment = asyncHandler(async (req, res, next) => {
  const segment = await Segment.findById(req.params.id);
  if (!segment) {
    return next(new AppError('Segment not found', 404));
  }

  await Segment.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Segment deleted successfully',
  });
});

module.exports = {
  getAllSegments,
  createSegment,
  updateSegment,
  deleteSegment,
};
