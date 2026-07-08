const RewardsConfig = require('../../models/RewardsConfig.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Fetch the global Rewards Configuration settings.
 * Creates a default setting if none exists in the database.
 * GET /api/super-admin/rewards-config
 */
const getRewardsConfig = asyncHandler(async (req, res, next) => {
  let config = await RewardsConfig.findOne().populate('updatedBy', 'name email');

  if (!config) {
    console.log('[Rewards Config Controller] No configuration found. Seeding default configurations...');
    config = await RewardsConfig.create({
      referralBonusPercentage: 5.0,
      milestoneAmount: 1000000,
      milestoneRewardPercentage: 1.0,
      minWithdrawalLimit: 5000,
      updatedBy: req.user.id,
    });
    config = await RewardsConfig.findById(config._id).populate('updatedBy', 'name email');
  }

  res.status(200).json({
    success: true,
    data: config,
  });
});

/**
 * Update the global Rewards Configuration settings.
 * PATCH /api/super-admin/rewards-config
 */
const updateRewardsConfig = asyncHandler(async (req, res, next) => {
  let config = await RewardsConfig.findOne();

  const updates = {};
  const fields = [
    'referralBonusPercentage',
    'milestoneAmount',
    'milestoneRewardPercentage',
    'minWithdrawalLimit',
  ];

  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = Number(req.body[field]);
    }
  });

  updates.updatedBy = req.user.id;

  if (!config) {
    // If not found, create new
    config = await RewardsConfig.create({
      referralBonusPercentage: updates.referralBonusPercentage !== undefined ? updates.referralBonusPercentage : 5.0,
      milestoneAmount: updates.milestoneAmount !== undefined ? updates.milestoneAmount : 1000000,
      milestoneRewardPercentage: updates.milestoneRewardPercentage !== undefined ? updates.milestoneRewardPercentage : 1.0,
      minWithdrawalLimit: updates.minWithdrawalLimit !== undefined ? updates.minWithdrawalLimit : 5000,
      updatedBy: req.user.id,
    });
  } else {
    // Update existing
    config = await RewardsConfig.findByIdAndUpdate(
      config._id,
      { $set: updates },
      { new: true, runValidators: true }
    );
  }

  config = await RewardsConfig.findById(config._id).populate('updatedBy', 'name email');

  res.status(200).json({
    success: true,
    message: 'Rewards configuration updated successfully',
    data: config,
  });
});

module.exports = {
  getRewardsConfig,
  updateRewardsConfig,
};
