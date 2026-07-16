const PerformanceReward = require('../../models/PerformanceReward.model');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../../services/cloudinary.service');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Seed standard performance rewards if catalog is empty
 */
const seedMockRewards = async (creatorId) => {
  return; // Disabled seeder
  const count = await PerformanceReward.countDocuments();
  if (count > 0) return;

  const mockRewards = [
    {
      targetMetricType: 'Clients Count',
      targetThresholdValue: '10 Clients',
      targetLimitDays: '45',
      targetLimitMonths: '3',
      targetMilestoneDescription: 'Recruit 10 Active Clients',
      rewardDescription: 'Free annual holiday package to Bali + Elite Partner Badge',
      rewardImage: '',
      rewardVideo: '',
      isActive: true,
      createdBy: creatorId,
    },
    {
      targetMetricType: 'Investment Volume (₹)',
      targetThresholdValue: '₹50.00 L',
      targetLimitDays: '90',
      targetLimitMonths: '6',
      targetMilestoneDescription: 'Reach ₹50 Lakhs Business Volume',
      rewardDescription: '₹1 Lakh cash bonus + Golden Trophy at annual meet',
      rewardImage: '',
      rewardVideo: '',
      isActive: true,
      createdBy: creatorId,
    },
    {
      targetMetricType: 'Investment Volume (₹)',
      targetThresholdValue: '₹1.00 Cr',
      targetLimitDays: '180',
      targetLimitMonths: '12',
      targetMilestoneDescription: 'Reach ₹1 Crore Business Volume',
      rewardDescription: '₹2.5 Lakhs cash bonus + Diamond Ring & VIP Board seat',
      rewardImage: '',
      rewardVideo: '',
      isActive: true,
      createdBy: creatorId,
    },
  ];

  await PerformanceReward.create(mockRewards);
  console.log('[Performance Reward Seeder] Successfully seeded standard rewards.');
};

/**
 * Create a new Performance Reward (Super Admin)
 * POST /api/super-admin/rewards
 */
const createPerformanceReward = asyncHandler(async (req, res, next) => {
  const {
    targetMetricType,
    targetThresholdValue,
    targetLimitDays,
    targetLimitMonths,
    targetMilestoneDescription,
    rewardDescription,
    isActive,
  } = req.body;

  let imageUrl = '';
  let videoUrl = '';

  if (req.files) {
    if (req.files.rewardImage && req.files.rewardImage[0]) {
      try {
        console.log('[Reward Controller] Uploading reward image...');
        imageUrl = await uploadBufferToCloudinary(req.files.rewardImage[0].buffer, 'kinetoscope/rewards');
      } catch (err) {
        return next(new AppError(`Reward Image upload failed: ${err.message}`, 500));
      }
    }
    if (req.files.rewardVideo && req.files.rewardVideo[0]) {
      try {
        console.log('[Reward Controller] Uploading reward video...');
        videoUrl = await uploadBufferToCloudinary(req.files.rewardVideo[0].buffer, 'kinetoscope/rewards');
      } catch (err) {
        return next(new AppError(`Reward Video upload failed: ${err.message}`, 500));
      }
    }
  }

  const reward = await PerformanceReward.create({
    targetMetricType,
    targetThresholdValue,
    targetLimitDays: targetLimitDays || '',
    targetLimitMonths: targetLimitMonths || '',
    targetMilestoneDescription,
    rewardDescription,
    rewardImage: imageUrl,
    rewardVideo: videoUrl,
    isActive: isActive !== undefined ? isActive : true,
    createdBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: 'Performance reward created successfully',
    data: reward,
  });
});

/**
 * Get all Performance Rewards (Super Admin view)
 * GET /api/super-admin/rewards
 */
const getAllPerformanceRewards = asyncHandler(async (req, res, next) => {
  const rewards = await PerformanceReward.find()
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    count: rewards.length,
    data: {
      rewards,
    },
  });
});

/**
 * Get details of a single Performance Reward
 * GET /api/super-admin/rewards/:id
 */
const getPerformanceRewardById = asyncHandler(async (req, res, next) => {
  const reward = await PerformanceReward.findById(req.params.id).populate('createdBy', 'name email');
  if (!reward) {
    return next(new AppError('Performance reward not found', 404));
  }

  res.status(200).json({
    success: true,
    data: reward,
  });
});

/**
 * Update an existing Performance Reward (Super Admin)
 * PATCH /api/super-admin/rewards/:id
 */
const updatePerformanceReward = asyncHandler(async (req, res, next) => {
  const reward = await PerformanceReward.findById(req.params.id);
  if (!reward) {
    return next(new AppError('Performance reward not found', 404));
  }

  const updates = {};
  const fields = [
    'targetMetricType',
    'targetThresholdValue',
    'targetLimitDays',
    'targetLimitMonths',
    'targetMilestoneDescription',
    'rewardDescription',
    'isActive',
  ];

  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      if (field === 'isActive') {
        updates[field] = req.body[field] === 'true' || req.body[field] === true;
      } else {
        updates[field] = req.body[field];
      }
    }
  });

  // Handle file replacements
  if (req.files) {
    // 1. Image update
    if (req.files.rewardImage && req.files.rewardImage[0]) {
      if (reward.rewardImage) {
        try {
          console.log('[Reward Controller] Deleting old image:', reward.rewardImage);
          await deleteFromCloudinary(reward.rewardImage);
        } catch (err) {
          console.error('[Reward Controller Cleanup] Image deletion failed:', err.message);
        }
      }
      try {
        console.log('[Reward Controller] Uploading new image...');
        updates.rewardImage = await uploadBufferToCloudinary(req.files.rewardImage[0].buffer, 'kinetoscope/rewards');
      } catch (err) {
        return next(new AppError(`Reward Image upload failed: ${err.message}`, 500));
      }
    }

    // 2. Video update
    if (req.files.rewardVideo && req.files.rewardVideo[0]) {
      if (reward.rewardVideo) {
        try {
          console.log('[Reward Controller] Deleting old video:', reward.rewardVideo);
          await deleteFromCloudinary(reward.rewardVideo);
        } catch (err) {
          console.error('[Reward Controller Cleanup] Video deletion failed:', err.message);
        }
      }
      try {
        console.log('[Reward Controller] Uploading new video...');
        updates.rewardVideo = await uploadBufferToCloudinary(req.files.rewardVideo[0].buffer, 'kinetoscope/rewards');
      } catch (err) {
        return next(new AppError(`Reward Video upload failed: ${err.message}`, 500));
      }
    }
  }

  const updatedReward = await PerformanceReward.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('createdBy', 'name email');

  res.status(200).json({
    success: true,
    message: 'Performance reward updated successfully',
    data: updatedReward,
  });
});

/**
 * Delete a Performance Reward (Super Admin)
 * DELETE /api/super-admin/rewards/:id
 */
const deletePerformanceReward = asyncHandler(async (req, res, next) => {
  const reward = await PerformanceReward.findById(req.params.id);
  if (!reward) {
    return next(new AppError('Performance reward not found', 404));
  }

  // Delete media files from Cloudinary
  if (reward.rewardImage) {
    try {
      console.log('[Reward Controller] Deleting image on delete:', reward.rewardImage);
      await deleteFromCloudinary(reward.rewardImage);
    } catch (err) {
      console.error('[Reward Controller Cleanup] Image deletion on delete failed:', err.message);
    }
  }

  if (reward.rewardVideo) {
    try {
      console.log('[Reward Controller] Deleting video on delete:', reward.rewardVideo);
      await deleteFromCloudinary(reward.rewardVideo);
    } catch (err) {
      console.error('[Reward Controller Cleanup] Video deletion on delete failed:', err.message);
    }
  }

  await PerformanceReward.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Performance reward deleted successfully',
  });
});

/**
 * Get active performance rewards (Agent view)
 * GET /api/agent/rewards
 */
const getAgentPerformanceRewards = asyncHandler(async (req, res, next) => {
  const rewards = await PerformanceReward.find({ isActive: true })
    .select('-createdBy -createdAt -updatedAt -__v')
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    count: rewards.length,
    data: {
      rewards,
    },
  });
});

/**
 * Claim a Performance Reward (Agent view)
 * POST /api/agent/rewards/claim
 */
const claimReward = asyncHandler(async (req, res, next) => {
  const RewardClaim = require('../../models/RewardClaim.model');
  const agentId = req.user.id;
  const { rewardId, deliveryAddress, contactNumber, additionalNote } = req.body;

  if (!rewardId) {
    return next(new AppError('Please provide a valid Reward ID', 400));
  }

  if (!deliveryAddress || !contactNumber) {
    return next(new AppError('Delivery address and contact number are required to claim a reward', 400));
  }

  // 1) Verify the reward exists and is active
  const reward = await PerformanceReward.findOne({ _id: rewardId, isActive: true });
  if (!reward) {
    return next(new AppError('Performance reward not found or is currently inactive', 404));
  }

  // 2) Prevent double claims
  const existingClaim = await RewardClaim.findOne({ agentId, rewardId, status: { $ne: 'REJECTED' } });
  if (existingClaim) {
    return next(new AppError('You have already submitted a claim request for this reward', 400));
  }

  // 3) Create the Claim request
  const claim = await RewardClaim.create({
    agentId,
    rewardId,
    deliveryAddress,
    contactNumber,
    additionalNote: additionalNote || '',
    status: 'PENDING',
  });

  res.status(201).json({
    success: true,
    message: 'Reward claim request submitted successfully and is pending admin approval.',
    data: claim,
  });
});

module.exports = {
  createPerformanceReward,
  getAllPerformanceRewards,
  getPerformanceRewardById,
  updatePerformanceReward,
  deletePerformanceReward,
  getAgentPerformanceRewards,
  claimReward,
};
