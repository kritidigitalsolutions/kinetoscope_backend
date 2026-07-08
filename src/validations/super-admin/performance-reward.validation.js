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
 * Validation rules for creating a Performance Reward Milestone.
 */
const createRewardValidationRules = [
  body('targetMetricType')
    .trim()
    .notEmpty().withMessage('Target metric type is required')
    .isIn(['Clients Count', 'Investment Volume (₹)']).withMessage('Metric type must be either: Clients Count or Investment Volume (₹)'),

  body('targetThresholdValue')
    .trim()
    .notEmpty().withMessage('Target threshold value is required')
    .isString().withMessage('Threshold value must be a string'),

  body('targetLimitDays')
    .optional()
    .trim()
    .isString().withMessage('Target limit in days must be a string'),

  body('targetLimitMonths')
    .optional()
    .trim()
    .isString().withMessage('Target limit in months must be a string'),

  body('targetMilestoneDescription')
    .trim()
    .notEmpty().withMessage('Target milestone description is required')
    .isString().withMessage('Milestone description must be a string'),

  body('rewardDescription')
    .trim()
    .notEmpty().withMessage('Reward description is required')
    .isString().withMessage('Reward description must be a string'),

  body('isActive')
    .optional()
    .customSanitizer(val => {
      // Handle form-data strings ("true", "false")
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return true;
    })
    .isBoolean().withMessage('isActive must be a boolean'),

  validate,
];

/**
 * Validation rules for updating a Performance Reward Milestone.
 */
const updateRewardValidationRules = [
  body('targetMetricType')
    .optional()
    .trim()
    .isIn(['Clients Count', 'Investment Volume (₹)']).withMessage('Metric type must be either: Clients Count or Investment Volume (₹)'),

  body('targetThresholdValue')
    .optional()
    .trim()
    .isString().withMessage('Threshold value must be a string'),

  body('targetLimitDays')
    .optional()
    .trim()
    .isString().withMessage('Target limit in days must be a string'),

  body('targetLimitMonths')
    .optional()
    .trim()
    .isString().withMessage('Target limit in months must be a string'),

  body('targetMilestoneDescription')
    .optional()
    .trim()
    .isString().withMessage('Milestone description must be a string'),

  body('rewardDescription')
    .optional()
    .trim()
    .isString().withMessage('Reward description must be a string'),

  body('isActive')
    .optional()
    .customSanitizer(val => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return val;
    })
    .isBoolean().withMessage('isActive must be a boolean'),

  validate,
];

module.exports = {
  createRewardValidationRules,
  updateRewardValidationRules,
};
