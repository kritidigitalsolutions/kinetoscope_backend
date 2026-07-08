const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
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
 * Validation rules for creating/updating a Commission Slab.
 */
const slabValidationRules = [
  body('type')
    .trim()
    .notEmpty().withMessage('Slab type is required')
    .isIn(['one-time', 'monthly']).withMessage('Slab type must be either one-time or monthly'),

  body('minAmount')
    .notEmpty().withMessage('Minimum investment amount is required')
    .isNumeric().withMessage('Minimum investment amount must be a number')
    .isFloat({ min: 0 }).withMessage('Minimum investment amount cannot be negative'),

  body('maxAmount')
    .optional({ nullable: true })
    .custom((value) => {
      if (value !== null && value !== undefined && isNaN(value)) {
        throw new Error('Maximum investment amount must be a number or null');
      }
      if (value !== null && value !== undefined && Number(value) < 0) {
        throw new Error('Maximum investment amount cannot be negative');
      }
      return true;
    }),

  body('commissionPercentage')
    .notEmpty().withMessage('Commission percentage is required')
    .isNumeric().withMessage('Commission percentage must be a number')
    .isFloat({ min: 0 }).withMessage('Commission percentage cannot be negative'),

  validate,
];

/**
 * Validation rules for creating/updating a Special Agent Override.
 */
const overrideValidationRules = [
  body('agentId')
    .trim()
    .notEmpty().withMessage('Agent is required')
    .custom((val) => {
      if (!mongoose.Types.ObjectId.isValid(val)) {
        throw new Error('Invalid Agent ID format');
      }
      return true;
    }),

  body('commissionOverride')
    .notEmpty().withMessage('Commission override percentage is required')
    .isNumeric().withMessage('Commission override percentage must be a number')
    .isFloat({ min: 0 }).withMessage('Commission override percentage cannot be negative'),

  body('reason')
    .trim()
    .notEmpty().withMessage('Reason/Notes are required')
    .isString().withMessage('Reason must be a string'),

  validate,
];

module.exports = {
  slabValidationRules,
  overrideValidationRules,
};
