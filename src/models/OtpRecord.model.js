const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * OtpRecord Schema
 * Generic OTP storage for any sensitive action that requires email-verified OTP.
 * Supported purposes: 'change-email', 'change-password'
 *
 * Records are single-use and auto-expire via MongoDB TTL index.
 */
const otpRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The email the OTP is dispatched to (always the current email at time of request)
    currentEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    // Purpose of the OTP — controls which flow uses this record
    purpose: {
      type: String,
      required: true,
      enum: ['change-email', 'change-password', 'login-2fa'],
      immutable: true,
    },
    // Hashed OTP value — never stored in plaintext
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    // Generic payload for purpose-specific data (e.g. newEmail, hashedNewPassword)
    // Stored as a plain object so each flow can store what it needs
    pendingData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    // Used to enforce per-user resend cooldown (30 seconds)
    lastSentAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// MongoDB TTL index: MongoDB automatically removes documents after expiresAt
otpRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Fast lookup by userId + purpose
otpRecordSchema.index({ userId: 1, purpose: 1 });

/**
 * Instance method: Compare plain OTP against stored hash.
 * @param {string} candidateOtp - Raw OTP entered by user
 * @returns {Promise<boolean>}
 */
otpRecordSchema.methods.verifyOtp = async function (candidateOtp) {
  return bcrypt.compare(candidateOtp, this.otpHash);
};

/**
 * Static method: Hash a plain OTP before storage.
 * @param {string} otp - 6-digit plain OTP
 * @returns {Promise<string>} Bcrypt hash
 */
otpRecordSchema.statics.hashOtp = async function (otp) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
};

const OtpRecord = mongoose.model('OtpRecord', otpRecordSchema);

module.exports = OtpRecord;
