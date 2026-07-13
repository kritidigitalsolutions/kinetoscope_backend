const bcrypt = require('bcryptjs');
const User = require('../../models/User.model');
const OtpRecord = require('../../models/OtpRecord.model');
const ClientProfile = require('../../models/ClientProfile.model');
const AgentProfile = require('../../models/AgentProfile.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const { sendChangePasswordOtp } = require('../../services/email.service');

// OTP validity: 5 minutes
const OTP_EXPIRY_MS = 5 * 60 * 1000;

// Resend cooldown: 30 seconds
const RESEND_COOLDOWN_MS = 30 * 1000;

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

/**
 * Step 1 — Validate passwords and send OTP to current email.
 * POST /api/super-admin/settings/change-password/send-otp
 * Body: { currentPassword, newPassword, confirmPassword }
 */
const sendChangePasswordOtpHandler = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // 1) Fetch user with password field (normally excluded)
  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    return next(new AppError('User account not found', 404));
  }

  // 2) Verify current password is correct
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new AppError('Current password is incorrect', 401));
  }

  // 3) New password must differ from current password
  const isSameAsOld = await user.comparePassword(newPassword);
  if (isSameAsOld) {
    return next(new AppError('New password must be different from your current password', 400));
  }

  // 4) Confirm password must match new password
  if (newPassword !== confirmPassword) {
    return next(new AppError('New password and confirm password do not match', 400));
  }

  // 5) Enforce 30-second cooldown
  const existingOtp = await OtpRecord.findOne({ userId: req.user.id, purpose: 'change-password' });
  if (existingOtp) {
    const elapsed = Date.now() - new Date(existingOtp.lastSentAt).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return next(new AppError(`Please wait ${waitSeconds} second(s) before requesting a new OTP`, 429));
    }
    await OtpRecord.deleteMany({ userId: req.user.id, purpose: 'change-password' });
  }

  // 6) Hash the new password NOW and store it in pendingData
  // This way verify-otp only needs to apply it — no need to resend passwords
  const salt = await bcrypt.genSalt(10);
  const hashedNewPassword = await bcrypt.hash(newPassword, salt);

  // 7) Generate + hash OTP
  const otp = generateOtp();
  console.log(`\n==================================================`);
  console.log(`[TESTING OTP] Change-password OTP for ${user.email}: ${otp}`);
  console.log(`==================================================\n`);
  const otpHash = await OtpRecord.hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  // 8) Persist OTP record with the hashed new password and plain text password in pendingData
  await OtpRecord.create({
    userId: req.user.id,
    currentEmail: user.email,
    purpose: 'change-password',
    otpHash,
    pendingData: { 
      hashedNewPassword,
      plainNewPassword: newPassword
    },
    expiresAt,
    lastSentAt: new Date(),
  });

  // 9) Send OTP to current email
  await sendChangePasswordOtp(user.email, otp);

  res.status(200).json({
    success: true,
    message: 'OTP sent successfully to your email address. Verify to confirm the password change.',
  });
});

/**
 * Step 2 — Verify OTP and apply the new password.
 * POST /api/super-admin/settings/change-password/verify-otp
 * Body: { otp }
 */
const verifyChangePasswordOtp = asyncHandler(async (req, res, next) => {
  const { otp } = req.body;

  // 1) Find active OTP record
  const otpRecord = await OtpRecord
    .findOne({
      userId: req.user.id,
      purpose: 'change-password',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    })
    .select('+otpHash');

  if (!otpRecord) {
    return next(new AppError('No valid OTP found. Please request a new OTP.', 400));
  }

  // 2) Verify OTP hash
  const isMatch = await otpRecord.verifyOtp(otp);
  if (!isMatch) {
    return next(new AppError('Invalid OTP. Please check and try again.', 401));
  }

  // 3) Apply the pre-hashed new password directly
  // Using $set with the hash directly — bypasses mongoose pre-save hook to avoid double-hashing
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { $set: { password: otpRecord.pendingData.hashedNewPassword } },
    { new: true }
  );

  // 3.5) Keep plain text password in sync on ClientProfile or AgentProfile for Super Admin portal hubs
  const plainPwd = otpRecord.pendingData.plainNewPassword;
  if (plainPwd && updatedUser) {
    if (updatedUser.role === 'client') {
      await ClientProfile.findOneAndUpdate({ userId: req.user.id }, { $set: { portalPassword: plainPwd } });
    } else if (updatedUser.role === 'agent') {
      await AgentProfile.findOneAndUpdate({ userId: req.user.id }, { $set: { portalPassword: plainPwd } });
    }
  }

  // 4) Delete OTP record (single-use enforcement)
  await OtpRecord.deleteMany({ userId: req.user.id, purpose: 'change-password' });

  res.status(200).json({
    success: true,
    message: 'Password changed successfully. Please log in again with your new password.',
  });
});

module.exports = {
  sendChangePasswordOtpHandler,
  verifyChangePasswordOtp,
};
