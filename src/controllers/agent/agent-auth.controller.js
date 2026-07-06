const User = require('../../models/User.model');
const AgentProfile = require('../../models/AgentProfile.model');
const OtpRecord = require('../../models/OtpRecord.model');
const transporter = require('../../config/mailer');
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

  // 5) Check if 2FA (OTP Verification) is enabled
  if (user.is2FAEnabled) {
    // Invalidate existing login-2fa OTPs
    await OtpRecord.deleteMany({ userId: user._id, purpose: 'login-2fa' });

    // Generate a secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP before storing
    const otpHash = await OtpRecord.hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create OtpRecord
    await OtpRecord.create({
      userId: user._id,
      currentEmail: user.email,
      purpose: 'login-2fa',
      otpHash,
      expiresAt,
      lastSentAt: new Date(),
    });

    // Send OTP to agent's email
    await transporter.sendMail({
      from: process.env.EMAIL_USER || process.env.SMTP_FROM || 'noreply@krossfilmproductions.com',
      to: user.email,
      subject: 'Your Kinetoscope Agent Login OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #1a1a2e; margin-bottom: 16px;">Agent Portal Login Verification</h2>
          <p>Hello ${user.name},</p>
          <p>Your one-time password (OTP) for logging into your Kinetoscope Agent dashboard is:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #10b981; margin: 24px 0; text-align: center; background: #f8fafc; padding: 12px; border-radius: 6px;">${otp}</div>
          <p>This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
          <p style="color: #94a3b8; font-size: 11px; margin-top: 24px;">If you did not attempt to log in, please secure your account immediately.</p>
        </div>
      `,
    });

    console.log(`[Agent 2FA OTP] Code sent to ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your registered email address.',
      requires2FA: true,
    });
  }

  // 6) Regular login without 2FA: sign token and update lastLogin
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Fetch agent profile to return alongside user data
  const profile = await AgentProfile.findOne({ userId: user._id });

  const token = signToken(user._id, user.role);
  const cookieOptions = getCookieOptions();
  res.cookie('jwt', token, cookieOptions);

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
 * Agent 2FA OTP Verification Handler
 * POST /api/agent/auth/verify-2fa
 */
const verify2FA = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new AppError('Please provide email and OTP code.', 400));
  }

  // 1) Find user by email
  const user = await User.findOne({ email });
  if (!user || user.role !== ROLES.AGENT) {
    return next(new AppError('Authentication failed. User not found.', 401));
  }

  // 2) Find active OTP record for login-2fa purpose
  const otpRecord = await OtpRecord.findOne({
    userId: user._id,
    purpose: 'login-2fa',
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).select('+otpHash');

  if (!otpRecord) {
    return next(new AppError('No valid OTP found. Please request a new OTP.', 400));
  }

  // 3) Verify OTP hash using bcrypt
  const isMatch = await otpRecord.verifyOtp(otp);
  if (!isMatch) {
    return next(new AppError('Invalid OTP code. Please check and try again.', 401));
  }

  // 4) Invalidate OTP record immediately
  await OtpRecord.deleteMany({ userId: user._id, purpose: 'login-2fa' });

  // 5) Update user lastLogin
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Fetch agent profile
  const profile = await AgentProfile.findOne({ userId: user._id });

  // 6) Sign JWT and set cookie
  const token = signToken(user._id, user.role);
  const cookieOptions = getCookieOptions();
  res.cookie('jwt', token, cookieOptions);

  res.status(200).json({
    success: true,
    message: 'OTP verified. Access granted.',
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
  verify2FA,
  logout,
  getMe,
};
