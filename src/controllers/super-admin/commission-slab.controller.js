const CommissionSlab = require('../../models/CommissionSlab.model');
const AgentOverride = require('../../models/AgentOverride.model');
const User = require('../../models/User.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const { ROLES } = require('../../constants/roles');

/**
 * Get all Slabs (Optional filter by type)
 * GET /api/super-admin/commission-slabs
 */
const getAllSlabs = asyncHandler(async (req, res, next) => {

  const { type } = req.query;
  const query = type ? { type } : {};

  const slabs = await CommissionSlab.find(query).sort({ minAmount: 1 }).lean();

  res.status(200).json({
    success: true,
    count: slabs.length,
    data: {
      slabs,
    },
  });
});

/**
 * Create a new Commission Slab
 * POST /api/super-admin/commission-slabs
 */
const createSlab = asyncHandler(async (req, res, next) => {
  const { type, minAmount, maxAmount, commissionPercentage } = req.body;

  const slab = await CommissionSlab.create({
    type,
    minAmount: Number(minAmount),
    maxAmount: maxAmount !== undefined && maxAmount !== null ? Number(maxAmount) : null,
    commissionPercentage: Number(commissionPercentage),
    createdBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: 'Commission slab created successfully',
    data: slab,
  });
});

/**
 * Update an existing Commission Slab
 * PATCH /api/super-admin/commission-slabs/:id
 */
const updateSlab = asyncHandler(async (req, res, next) => {
  const { minAmount, maxAmount, commissionPercentage } = req.body;

  const slab = await CommissionSlab.findById(req.params.id);
  if (!slab) {
    return next(new AppError('Commission slab not found', 404));
  }

  const updates = {};
  if (minAmount !== undefined) updates.minAmount = Number(minAmount);
  if (maxAmount !== undefined) updates.maxAmount = maxAmount !== null ? Number(maxAmount) : null;
  if (commissionPercentage !== undefined) updates.commissionPercentage = Number(commissionPercentage);

  const updatedSlab = await CommissionSlab.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Commission slab updated successfully',
    data: updatedSlab,
  });
});

/**
 * Delete a Commission Slab
 * DELETE /api/super-admin/commission-slabs/:id
 */
const deleteSlab = asyncHandler(async (req, res, next) => {
  const slab = await CommissionSlab.findById(req.params.id);
  if (!slab) {
    return next(new AppError('Commission slab not found', 404));
  }

  await CommissionSlab.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Commission slab deleted successfully',
  });
});

/**
 * Get all Special Overrides
 * GET /api/super-admin/commission-slabs/overrides
 */
const getAllOverrides = asyncHandler(async (req, res, next) => {

  const overrides = await AgentOverride.find()
    .populate('agentId', 'name email clientCode')
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    count: overrides.length,
    data: {
      overrides,
    },
  });
});

/**
 * Create a new Special Override
 * POST /api/super-admin/commission-slabs/overrides
 */
const createOverride = asyncHandler(async (req, res, next) => {
  const { agentId, commissionOverride, reason } = req.body;

  // Verify agent exists
  const agent = await User.findById(agentId);
  if (!agent || agent.role !== ROLES.AGENT) {
    return next(new AppError('Agent account not found', 404));
  }

  // Create override
  const override = await AgentOverride.create({
    agentId,
    commissionOverride: Number(commissionOverride),
    reason,
    createdBy: req.user.id,
  });

  const populated = await AgentOverride.findById(override._id).populate('agentId', 'name email clientCode');

  res.status(201).json({
    success: true,
    message: 'Special override created successfully',
    data: populated,
  });
});

/**
 * Update an existing Special Override
 * PATCH /api/super-admin/commission-slabs/overrides/:id
 */
const updateOverride = asyncHandler(async (req, res, next) => {
  const { commissionOverride, reason } = req.body;

  const override = await AgentOverride.findById(req.params.id);
  if (!override) {
    return next(new AppError('Special override config not found', 404));
  }

  const updates = {};
  if (commissionOverride !== undefined) updates.commissionOverride = Number(commissionOverride);
  if (reason !== undefined) updates.reason = reason;

  const updatedOverride = await AgentOverride.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('agentId', 'name email clientCode');

  res.status(200).json({
    success: true,
    message: 'Special override updated successfully',
    data: updatedOverride,
  });
});

/**
 * Delete a Special Override
 * DELETE /api/super-admin/commission-slabs/overrides/:id
 */
const deleteOverride = asyncHandler(async (req, res, next) => {
  const override = await AgentOverride.findById(req.params.id);
  if (!override) {
    return next(new AppError('Special override config not found', 404));
  }

  await AgentOverride.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Special override configuration deleted successfully',
  });
});

/**
 * Calculate Commission (Simulator API)
 * POST /api/super-admin/commission-slabs/calculate
 */
const calculateCommission = asyncHandler(async (req, res, next) => {
  const { amount, type } = req.body;

  if (amount === undefined || !type) {
    return next(new AppError('Amount and type (one-time or monthly) are required.', 400));
  }

  const numericAmt = Number(amount);
  if (numericAmt < 0) {
    return next(new AppError('Amount cannot be negative.', 400));
  }

  // Find all slabs matching the requested type
  const slabs = await CommissionSlab.find({ type }).sort({ minAmount: 1 }).lean();

  // Flat-rate matching: find the bracket where the amount falls
  let matchedPercentage = 0;
  let matchedSlab = null;

  for (const slab of slabs) {
    if (numericAmt >= slab.minAmount && (slab.maxAmount === null || numericAmt <= slab.maxAmount)) {
      matchedPercentage = slab.commissionPercentage;
      matchedSlab = slab;
      break;
    }
  }

  const commissionAmount = numericAmt * (matchedPercentage / 100);

  res.status(200).json({
    success: true,
    data: {
      amount: numericAmt,
      type,
      matchedPercentage,
      commissionAmount,
      matchedSlab,
    },
  });
});

module.exports = {
  getAllSlabs,
  createSlab,
  updateSlab,
  deleteSlab,
  getAllOverrides,
  createOverride,
  updateOverride,
  deleteOverride,
  calculateCommission,
};
