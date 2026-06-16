const User = require('../../models/User.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const { signToken, getCookieOptions } = require('../../utils/helpers');
const { ROLES } = require('../../constants/roles');

/**
 * One-time Super Admin Setup
 * POST /api/v1/auth/setup-admin
 */
const setupAdmin = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;

  // 1) Verify if any Super Admin already exists in the system
  const existingAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN });
  if (existingAdmin) {
    return next(new AppError('A Super Admin already exists in the system. Setup is blocked.', 409));
  }

  // 2) Check if email is already taken by another user type (e.g. client/agent)
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    return next(new AppError('Email address is already in use.', 400));
  }

  // 3) Create the Super Admin
  const admin = await User.create({
    name,
    email,
    password,
    role: ROLES.SUPER_ADMIN,
    isActive: true,
  });

  // Remove password from response payload
  admin.password = undefined;

  res.status(201).json({
    success: true,
    message: 'Super Admin created successfully. One-time setup completed.',
    data: {
      user: admin,
    },
  });
});

/**
 * Authentication Login Handler
 * POST /api/v1/auth/login
 */
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

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

  // 3) Verify account is active
  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact support.', 403));
  }

  // 4) Check if 2FA (OTP Verification) is enabled
  if (user.is2FAEnabled) {
    // Generate a secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP and Expiry (Valid for 10 minutes)
    user.otpCode = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    // Print OTP to console for debugging/delivery validation
    console.log(`\n========================================`);
    console.log(`[2FA OTP] Code for ${user.email} is: ${otp}`);
    console.log(`========================================\n`);

    // In development mode, return the OTP directly in JSON response for easy Postman testing
    const responsePayload = {
      success: true,
      message: 'OTP sent successfully',
      requires2FA: true,
    };

    if (process.env.NODE_ENV === 'development') {
      responsePayload.devOtp = otp;
    }

    return res.status(200).json(responsePayload);
  }

  // 5) Regular login without 2FA: sign token and update lastLogin
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(user._id, user.role);
  const cookieOptions = getCookieOptions();
  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    token,
    data: {
      user,
    },
  });
});

/**
 * 2FA OTP Verification Handler
 * POST /api/v1/auth/verify-2fa
 */
const verify2FA = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;

  // 1) Find user by email and select the otpCode and otpExpiry fields
  const user = await User.findOne({ email }).select('+otpCode +otpExpiry');
  if (!user) {
    return next(new AppError('Authentication failed. User not found.', 401));
  }

  // 2) Check if OTP exists and is correct
  if (!user.otpCode || user.otpCode !== otp) {
    return next(new AppError('Invalid OTP code. Please check and try again.', 401));
  }

  // 3) Check if OTP has expired
  if (new Date() > user.otpExpiry) {
    return next(new AppError('OTP has expired. Please request a new code.', 401));
  }

  // 4) OTP is valid: Clear the OTP fields
  user.otpCode = undefined;
  user.otpExpiry = undefined;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // 5) Sign JWT and set cookie
  const token = signToken(user._id, user.role);
  const cookieOptions = getCookieOptions();
  res.cookie('jwt', token, cookieOptions);

  res.status(200).json({
    success: true,
    message: 'OTP verified. Access granted.',
    token,
    data: {
      user,
    },
  });
});

/**
 * Get currently authenticated user profile
 * GET /api/v1/auth/profile
 */
const getProfile = asyncHandler(async (req, res, next) => {
  // req.user is populated by protect middleware
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

/**
 * Update authenticated user profile
 * PATCH /api/v1/auth/profile
 */
const updateProfile = asyncHandler(async (req, res, next) => {
  // Only allow updating name and is2FAEnabled.
  // Email changes must go through the OTP-verified change-email flow.
  const allowedUpdates = ['name', 'is2FAEnabled'];
  const updates = {};

  for (const key of Object.keys(req.body)) {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  }

  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return next(new AppError('User profile session could not be found.', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user,
    },
  });
});

/**
 * Change authenticated user password
 * PATCH /api/v1/auth/change-password
 */
const changePassword = asyncHandler(async (req, res, next) => {
  // Prevent Super Admin from bypassing OTP-verified flow
  if (req.user.role === 'super-admin') {
    return next(
      new AppError(
        'Super Admin must change their password using the OTP-verified flow under /api/super-admin/settings/change-password/send-otp',
        403
      )
    );
  }

  const { currentPassword, newPassword } = req.body;

  // 1) Find the user by ID and select their password
  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    return next(new AppError('User session not found.', 404));
  }

  // 2) Verify current password is correct
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new AppError('Incorrect current password.', 401));
  }

  // 3) Set new password (this will trigger mongoose pre('save') hash hook)
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully. Please use your new password for subsequent logins.',
  });
});

/**
 * Log out authenticated user (Clears JWT Cookie)
 * POST /api/v1/auth/logout
 */
const logout = asyncHandler(async (req, res, next) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // set expiry to 10 seconds
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

module.exports = {
  setupAdmin,
  login,
  verify2FA,
  getProfile,
  updateProfile,
  changePassword,
  logout,
};
