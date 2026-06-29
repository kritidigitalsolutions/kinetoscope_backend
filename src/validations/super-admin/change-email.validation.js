const { body, validationResult } = require('express-validator');
const AppError = require('../../utils/AppError');

/**
 * Common middleware to compile express-validator errors and forward to global error handler.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const message = errors.array().map(err => err.msg).join(', ');
  return next(new AppError(message, 400));
};

/**
 * Validation rules for Send OTP (change email initiation)
 */
const sendChangeEmailOtpRules = [
  body('currentEmail')
    .trim()
    .notEmpty().withMessage('Current email is required')
    .isEmail().withMessage('Current email must be a valid email address')
    .normalizeEmail(),

  body('newEmail')
    .trim()
    .notEmpty().withMessage('New email is required')
    .isEmail().withMessage('New email must be a valid email address')
    .normalizeEmail(),

  validate,
];

/**
 * Validation rules for OTP Verification
 */
const verifyChangeEmailOtpRules = [
  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits')
    .isNumeric().withMessage('OTP must contain numeric digits only'),

  validate,
];

module.exports = {
  sendChangeEmailOtpRules,
  verifyChangeEmailOtpRules,
};
