const User = require('../../models/User.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Get current Super Admin security settings (including 2FA state)
 * GET /api/super-admin/settings
 */
const getSettings = asyncHandler(async (req, res, next) => {
  // req.user is already populated by protect middleware
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Settings retrieved successfully',
    data: {
      settings: {
        is2FAEnabled: user.is2FAEnabled,
        email: user.email,
        name: user.name,
      },
    },
  });
});

/**
 * Toggle Two-Factor Authentication (2FA) for the Super Admin
 * PATCH /api/super-admin/settings/2fa
 * Body: { is2FAEnabled: true | false }
 */
const toggle2FA = asyncHandler(async (req, res, next) => {
  const { is2FAEnabled } = req.body;

  // Strict boolean check
  if (typeof is2FAEnabled !== 'boolean') {
    return next(new AppError('is2FAEnabled must be a boolean value (true or false)', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { is2FAEnabled },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    success: true,
    message: `Two-Factor Authentication has been ${is2FAEnabled ? 'enabled' : 'disabled'} successfully`,
    data: {
      is2FAEnabled: user.is2FAEnabled,
    },
  });
});

const { ROLES } = require('../../constants/roles');

/**
 * Toggle 2FA for all clients globally (Super Admin only)
 * PATCH /api/super-admin/settings/client-2fa
 * Body: { is2FAEnabled: true | false }
 */
const toggleClient2FA = asyncHandler(async (req, res, next) => {
  const { is2FAEnabled } = req.body;

  if (typeof is2FAEnabled !== 'boolean') {
    return next(new AppError('is2FAEnabled must be a boolean value (true or false)', 400));
  }

  const result = await User.updateMany(
    { role: ROLES.CLIENT },
    { is2FAEnabled }
  );

  res.status(200).json({
    success: true,
    message: `Two-Factor Authentication has been ${is2FAEnabled ? 'enabled' : 'disabled'} globally for all clients successfully.`,
    data: {
      is2FAEnabled,
      affectedCount: result.modifiedCount,
    },
  });
});

/**
 * Toggle 2FA for all agents globally (Super Admin only)
 * PATCH /api/super-admin/settings/agent-2fa
 * Body: { is2FAEnabled: true | false }
 */
const toggleAgent2FA = asyncHandler(async (req, res, next) => {
  const { is2FAEnabled } = req.body;

  if (typeof is2FAEnabled !== 'boolean') {
    return next(new AppError('is2FAEnabled must be a boolean value (true or false)', 400));
  }

  const result = await User.updateMany(
    { role: ROLES.AGENT },
    { is2FAEnabled }
  );

  res.status(200).json({
    success: true,
    message: `Two-Factor Authentication has been ${is2FAEnabled ? 'enabled' : 'disabled'} globally for all agents successfully.`,
    data: {
      is2FAEnabled,
      affectedCount: result.modifiedCount,
    },
  });
});

module.exports = {
  getSettings,
  toggle2FA,
  toggleClient2FA,
  toggleAgent2FA,
};
