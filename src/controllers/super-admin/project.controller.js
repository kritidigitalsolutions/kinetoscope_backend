const Project = require('../../models/Project.model');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../../services/cloudinary.service');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Seed default mock projects if catalog is empty
 */
const seedMockProjects = async (creatorId) => {
  const mongoose = require('mongoose');
  const SystemConfig = mongoose.models.SystemConfig || mongoose.model('SystemConfig', new mongoose.Schema({
    key: { type: String, unique: true },
    value: Boolean
  }));

  const config = await SystemConfig.findOne({ key: 'projects_seeded' });
  if (config && config.value) {
    return;
  }

  const count = await Project.countDocuments();
  if (count > 0) {
    await SystemConfig.findOneAndUpdate({ key: 'projects_seeded' }, { value: true }, { upsert: true });
    return;
  }

  const mockProjects = [
    {
      name: 'Project Astra',
      segment: 'Film Making',
      status: 'In Production',
      portfolioValue: '₹2.5 Cr',
      monthlyRoi: '1.25%',
      riskLevel: 'Medium',
      milestoneProgress: 65,
      health: 'On Track',
      summary: 'Flagship feature slate moving through production with cast-led marketing upside.',
      bannerImage: '',
      createdBy: creatorId,
    },
    {
      name: 'Rhythm Series',
      segment: 'Music',
      status: 'Recording',
      portfolioValue: '₹1.8 Cr',
      monthlyRoi: '0.83%',
      riskLevel: 'Low',
      milestoneProgress: 40,
      health: 'On Track',
      summary: 'Music catalogue and album pipeline with recurring streaming revenue potential.',
      bannerImage: '',
      createdBy: creatorId,
    },
    {
      name: 'Meridian Release',
      segment: 'Distribution',
      status: 'Active',
      portfolioValue: '₹3.2 Cr',
      monthlyRoi: '1.00%',
      riskLevel: 'Medium',
      milestoneProgress: 80,
      health: 'Performing',
      summary: 'Distribution portfolio across domestic and digital channels.',
      bannerImage: '',
      createdBy: creatorId,
    },
    {
      name: 'Vanguard Exhibition',
      segment: 'Film Exhibition',
      status: 'Active',
      portfolioValue: '₹4.5 Cr',
      monthlyRoi: '1.50%',
      riskLevel: 'High',
      milestoneProgress: 50,
      health: 'Under Review',
      summary: 'Premium screen expansion across multiple metro areas.',
      bannerImage: '',
      createdBy: creatorId,
    },
    {
      name: 'IP Rights Library',
      segment: 'Content IP Bank',
      status: 'Active',
      portfolioValue: '₹2.0 Cr',
      monthlyRoi: '1.10%',
      riskLevel: 'Low',
      milestoneProgress: 30,
      health: 'Performing',
      summary: 'Acquisition and monetization of classic film and music IP assets.',
      bannerImage: '',
      createdBy: creatorId,
    },
    {
      name: 'Syndication Deal A',
      segment: 'Trading & Syndication',
      status: 'Active',
      portfolioValue: '₹1.5 Cr',
      monthlyRoi: '0.95%',
      riskLevel: 'Medium',
      milestoneProgress: 15,
      health: 'On Track',
      summary: 'Regional broadcast rights syndication deal.',
      bannerImage: '',
      createdBy: creatorId,
    },
  ];

  await Project.create(mockProjects);
  await SystemConfig.findOneAndUpdate({ key: 'projects_seeded' }, { value: true }, { upsert: true });
  console.log('[Project Seeder] Successfully seeded standard projects in Project Catalog.');
};

/**
 * Create a new Project (Super Admin only)
 * POST /api/super-admin/projects
 */
const createProject = asyncHandler(async (req, res, next) => {
  const {
    name,
    segment,
    status,
    portfolioValue,
    monthlyRoi,
    riskLevel,
    milestoneProgress,
    health,
    summary,
  } = req.body;

  let bannerImageUrl = '';
  if (req.file) {
    try {
      console.log('[Project Controller] Uploading project banner image to Cloudinary...');
      bannerImageUrl = await uploadBufferToCloudinary(req.file.buffer, 'kinetoscope/projects');
    } catch (uploadError) {
      return next(new AppError(`Banner image upload failed: ${uploadError.message}`, 500));
    }
  }

  const project = await Project.create({
    name,
    segment,
    status,
    portfolioValue,
    monthlyRoi,
    riskLevel: riskLevel || 'Medium',
    milestoneProgress: milestoneProgress !== undefined ? Number(milestoneProgress) : 0,
    health: health || 'On Track',
    summary: summary || '',
    bannerImage: bannerImageUrl,
    createdBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    data: project,
  });
});

/**
 * Get all Projects (Supports statistics calculations)
 * GET /api/super-admin/projects
 */
const getAllProjects = asyncHandler(async (req, res, next) => {
  // Auto-seed standard projects if empty
  await seedMockProjects(req.user.id);

  const projects = await Project.find()
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  // Compute card stats
  const totalProjects = projects.length;
  let avgProgress = 0;
  if (totalProjects > 0) {
    const progressSum = projects.reduce((sum, p) => sum + (p.milestoneProgress || 0), 0);
    avgProgress = Math.round(progressSum / totalProjects);
  }

  res.status(200).json({
    success: true,
    data: {
      projects,
      stats: {
        totalProjects,
        avgProgress,
      },
    },
  });
});

/**
 * Get single Project details
 * GET /api/super-admin/projects/:id
 */
const getProjectById = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id).populate('createdBy', 'name email');
  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  res.status(200).json({
    success: true,
    data: project,
  });
});

/**
 * Update an existing Project (Super Admin only)
 * PATCH /api/super-admin/projects/:id
 */
const updateProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  const updates = {};
  const allowedFields = [
    'name',
    'segment',
    'status',
    'portfolioValue',
    'monthlyRoi',
    'riskLevel',
    'milestoneProgress',
    'health',
    'summary',
    'mediaFiles',
  ];

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (updates.milestoneProgress !== undefined) {
    updates.milestoneProgress = Number(updates.milestoneProgress);
  }

  // Handle banner image removal if explicitly set to empty or null
  if (req.body.bannerImage === '' || req.body.bannerImage === null || req.body.bannerImage === 'null') {
    updates.bannerImage = '';
    if (project.bannerImage) {
      try {
        console.log('[Project Controller] Deleting banner image from Cloudinary for removal:', project.bannerImage);
        await deleteFromCloudinary(project.bannerImage);
      } catch (err) {
        console.error('[Project Controller Cleanup] Failed to delete banner image:', err.message);
      }
    }
  }

  // Handle banner image replacement
  if (req.file) {
    // Delete old image if exists
    if (project.bannerImage) {
      try {
        console.log('[Project Controller] Deleting old banner image from Cloudinary:', project.bannerImage);
        await deleteFromCloudinary(project.bannerImage);
      } catch (err) {
        console.error('[Project Controller Cleanup] Failed to delete old banner image:', err.message);
      }
    }

    // Upload new image
    try {
      console.log('[Project Controller] Uploading new banner image to Cloudinary...');
      updates.bannerImage = await uploadBufferToCloudinary(req.file.buffer, 'kinetoscope/projects');
    } catch (uploadError) {
      return next(new AppError(`Banner image upload failed: ${uploadError.message}`, 500));
    }
  }

  const updatedProject = await Project.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('createdBy', 'name email');

  res.status(200).json({
    success: true,
    message: 'Project updated successfully',
    data: updatedProject,
  });
});

/**
 * Delete a Project (Super Admin only)
 * DELETE /api/super-admin/projects/:id
 */
const deleteProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Delete banner image from Cloudinary
  if (project.bannerImage) {
    try {
      console.log('[Project Controller] Deleting banner image from Cloudinary:', project.bannerImage);
      await deleteFromCloudinary(project.bannerImage);
    } catch (err) {
      console.error('[Project Controller Cleanup] Failed to delete banner image on deletion:', err.message);
    }
  }

  await Project.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Project deleted successfully',
  });
});

/**
 * Get all projects for Client Portal (Read-only view)
 * GET /api/client/projects
 */
const getClientProjects = asyncHandler(async (req, res, next) => {
  // Retrieve list of projects
  const projects = await Project.find()
    .sort({ createdAt: -1 })
    .select('-createdBy -createdAt -updatedAt -__v')
    .lean();

  res.status(200).json({
    success: true,
    count: projects.length,
    data: {
      projects,
    },
  });
});

/**
 * Upload a media file/image to a Project (Super Admin only)
 * POST /api/super-admin/projects/:id/media
 */
const uploadProjectMedia = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  const file = req.file || (req.files && req.files[0]);
  if (!file) {
    return next(new AppError('Please upload a file.', 400));
  }

  let mediaUrl = '';
  try {
    console.log('[Project Controller] Uploading project media file to Cloudinary...');
    mediaUrl = await uploadBufferToCloudinary(file.buffer, 'kinetoscope/projects/media');
  } catch (uploadError) {
    return next(new AppError(`Media upload failed: ${uploadError.message}`, 500));
  }

  project.mediaFiles.push(mediaUrl);
  await project.save();

  res.status(200).json({
    success: true,
    message: 'Media file uploaded successfully',
    data: {
      url: mediaUrl,
      project,
    },
  });
});

/**
 * Delete a media file/image from a Project (Super Admin only)
 * DELETE /api/super-admin/projects/:id/media
 */
const deleteProjectMedia = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  const { url } = req.body;
  if (!url) {
    return next(new AppError('Please provide the URL of the media file to delete.', 400));
  }

  // Remove url from array
  const originalLength = project.mediaFiles.length;
  project.mediaFiles = project.mediaFiles.filter(item => item !== url);

  if (project.mediaFiles.length === originalLength) {
    return next(new AppError('Media file URL not found in this project.', 404));
  }

  // Delete from Cloudinary
  try {
    console.log('[Project Controller] Deleting media file from Cloudinary:', url);
    await deleteFromCloudinary(url);
  } catch (err) {
    console.error('[Project Controller Cleanup] Failed to delete project media file:', err.message);
  }

  await project.save();

  res.status(200).json({
    success: true,
    message: 'Media file deleted successfully',
    data: project,
  });
});

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getClientProjects,
  uploadProjectMedia,
  deleteProjectMedia,
};
