const User = require('../../models/User.model');
const AgentProfile = require('../../models/AgentProfile.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const { signToken, getCookieOptions } = require('../../utils/helpers');
const { ROLES } = require('../../constants/roles');

/**
 * Agent Login Handler
 * POST /api/agent/auth/login
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

  // 3) Enforce role = agent restriction. Return 403 if non-agent.
  if (user.role !== ROLES.AGENT) {
    return next(new AppError('Access Denied. Only agent accounts are permitted to log in to this portal.', 403));
  }

  // 4) Verify account is active
  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated or blocked. Please contact admin.', 403));
  }

  // 5) Update user lastLogin
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // 6) Fetch agent profile to return alongside user data
  const profile = await AgentProfile.findOne({ userId: user._id });

  // 7) Sign token and set cookie
  const token = signToken(user._id, user.role);
  const cookieOptions = getCookieOptions();
  res.cookie('jwt', token, cookieOptions);

  // Remove password from response
  user.password = undefined;

  res.status(200).json({
    success: true,
    message: 'Logged in successfully to agent portal.',
    token,
    data: {
      user,
      profile,
    },
  });
});

/**
 * Agent Logout Handler
 * POST /api/agent/auth/logout
 */
const logout = asyncHandler(async (req, res, next) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // expire in 10 seconds
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully from agent portal.',
  });
});

/**
 * Get currently authenticated agent's session details
 * GET /api/agent/auth/me
 */
const getMe = asyncHandler(async (req, res, next) => {
  if (req.user.role !== ROLES.AGENT) {
    return next(new AppError('Access Denied. Only agent accounts are permitted.', 403));
  }

  const profile = await AgentProfile.findOne({ userId: req.user.id });

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
