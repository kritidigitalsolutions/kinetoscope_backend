const User = require('../../models/User.model');
const ClientProfile = require('../../models/ClientProfile.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const { signToken, getCookieOptions } = require('../../utils/helpers');
const { ROLES } = require('../../constants/roles');

/**
 * Client Login Handler
 * POST /api/client/auth/login
 */
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 1) Find user by email and select password field
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return next(new AppError('Invalid email address or password', 401));
  }

  // 2) Verify user password match
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new AppError('Invalid email address or password', 401));
  }

  // 3) Enforce role = client restriction. Return 403 if non-client.
  if (user.role !== ROLES.CLIENT) {
    return next(new AppError('Access Denied. Only client accounts are permitted to log in to this portal.', 403));
  }

  // 4) Verify account is active
  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact support.', 403));
  }

  // 5) Update user lastLogin
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // 6) Fetch client profile to return alongside user data
  const profile = await ClientProfile.findOne({ userId: user._id });

  // 7) Sign token and set cookie
  const token = signToken(user._id, user.role);
  const cookieOptions = getCookieOptions();
  res.cookie('jwt', token, cookieOptions);

  // Remove password from response
  user.password = undefined;

  res.status(200).json({
    success: true,
    message: 'Logged in successfully to client portal.',
    token,
    data: {
      user,
      profile,
    },
  });
});

/**
 * Client Logout Handler
 * POST /api/client/auth/logout
 */
const logout = asyncHandler(async (req, res, next) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // expire in 10 seconds
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully from client portal.',
  });
});

/**
 * Get currently authenticated client's session details
 * GET /api/client/auth/me
 */
const getMe = asyncHandler(async (req, res, next) => {
  // req.user is populated by protect middleware
  if (req.user.role !== ROLES.CLIENT) {
    return next(new AppError('Access Denied. Only client accounts are permitted.', 403));
  }

  const profile = await ClientProfile.findOne({ userId: req.user.id });

  res.status(200).json({
    success: true,
    data: {
      user: req.user,
      profile,
    },
  });
});

module.exports = {
  login,
  logout,
  getMe,
};
