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
 * Validation rules for Send OTP (change password initiation)
 */
const sendChangePasswordOtpRules = [
  (req, res, next) => {
    if (req.body) {
      if (req.body.oldPassword) req.body.currentPassword = req.body.oldPassword;
      if (req.body.old_password) req.body.currentPassword = req.body.old_password;
      if (req.body.current_password) req.body.currentPassword = req.body.current_password;

      if (req.body.new_password) req.body.newPassword = req.body.new_password;
      if (req.body.password && !req.body.newPassword) req.body.newPassword = req.body.password;

      if (req.body.confirmNewPassword) req.body.confirmPassword = req.body.confirmNewPassword;
      if (req.body.confirm_password) req.body.confirmPassword = req.body.confirm_password;
      if (req.body.confirm_new_password) req.body.confirmPassword = req.body.confirm_new_password;
    }
    next();
  },
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters long'),

  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required'),

  validate,
];

/**
 * Validation rules for Password OTP Verification
 */
const verifyChangePasswordOtpRules = [
  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits')
    .isNumeric().withMessage('OTP must contain numeric digits only'),

  validate,
];

module.exports = {
  sendChangePasswordOtpRules,
  verifyChangePasswordOtpRules,
};
