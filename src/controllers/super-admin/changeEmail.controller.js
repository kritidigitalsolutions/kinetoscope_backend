const User = require('../../models/User.model');
const OtpRecord = require('../../models/OtpRecord.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const { sendChangeEmailOtp } = require('../../services/email.service');

// OTP validity: 5 minutes
const OTP_EXPIRY_MS = 5 * 60 * 1000;

// Resend cooldown: 30 seconds
const RESEND_COOLDOWN_MS = 30 * 1000;

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

/**
 * Send OTP to current email for email change verification.
 * POST /api/super-admin/settings/change-email/send-otp
 * Body: { currentEmail, newEmail }
 */
const sendChangeEmailOtpHandler = asyncHandler(async (req, res, next) => {
  const { currentEmail, newEmail } = req.body;

  // 1) Verify current email matches logged-in admin
  if (req.user.email !== currentEmail.toLowerCase().trim()) {
    return next(new AppError('Current email does not match your account email', 400));
  }

  // 2) New email must differ from current
  if (currentEmail.toLowerCase().trim() === newEmail.toLowerCase().trim()) {
    return next(new AppError('New email must be different from your current email', 400));
  }

  // 3) New email must not be taken
  const emailTaken = await User.findOne({ email: newEmail.toLowerCase().trim() });
  if (emailTaken) {
    return next(new AppError('This email address is already associated with another account', 409));
  }

  // 4) Enforce 30-second cooldown
  const existingOtp = await OtpRecord.findOne({ userId: req.user.id, purpose: 'change-email' });
  if (existingOtp) {
    const elapsed = Date.now() - new Date(existingOtp.lastSentAt).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return next(new AppError(`Please wait ${waitSeconds} second(s) before requesting a new OTP`, 429));
    }
    await OtpRecord.deleteMany({ userId: req.user.id, purpose: 'change-email' });
  }

  // 5) Generate + hash OTP
  const otp = generateOtp();
  const otpHash = await OtpRecord.hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  // 6) Persist OTP record — store newEmail in pendingData
  await OtpRecord.create({
    userId: req.user.id,
    currentEmail: currentEmail.toLowerCase().trim(),
    purpose: 'change-email',
    otpHash,
    pendingData: { newEmail: newEmail.toLowerCase().trim() },
    expiresAt,
    lastSentAt: new Date(),
  });

  // 7) Send OTP email
  await sendChangeEmailOtp(currentEmail, otp, newEmail);

  res.status(200).json({
    success: true,
    message: 'OTP sent successfully to your current email address. Valid for 5 minutes.',
  });
});

/**
 * Verify OTP and update email address.
 * POST /api/super-admin/settings/change-email/verify-otp
 * Body: { otp }
 */
const verifyChangeEmailOtp = asyncHandler(async (req, res, next) => {
  const { otp } = req.body;

  // 1) Find active OTP record
  const otpRecord = await OtpRecord
    .findOne({
      userId: req.user.id,
      purpose: 'change-email',
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

  // 3) Apply email change
  const newEmail = otpRecord.pendingData.newEmail;
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { email: newEmail },
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    return next(new AppError('User account not found', 404));
  }

  // 4) Delete OTP record (single-use)
  await OtpRecord.deleteMany({ userId: req.user.id, purpose: 'change-email' });

  res.status(200).json({
    success: true,
    message: 'Email updated successfully. Please log in again with your new email.',
    data: {
      email: updatedUser.email,
    },
  });
});

module.exports = {
  sendChangeEmailOtpHandler,
  verifyChangeEmailOtp,
};
