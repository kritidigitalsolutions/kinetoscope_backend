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
 * Validation rules for creating a Segment.
 */
const createSegmentValidationRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Segment name is required')
    .isString().withMessage('Segment name must be a string'),

  body('statuses')
    .optional()
    .isArray().withMessage('Statuses must be an array of strings')
    .custom((statuses) => {
      if (statuses) {
        for (const status of statuses) {
          if (typeof status !== 'string' || status.trim() === '') {
            throw new Error('Each status in the list must be a non-empty string');
          }
        }
      }
      return true;
    }),

  validate,
];

/**
 * Validation rules for updating a Segment.
 */
const updateSegmentValidationRules = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Segment name cannot be empty')
    .isString().withMessage('Segment name must be a string'),

  body('statuses')
    .optional()
    .isArray().withMessage('Statuses must be an array of strings')
    .custom((statuses) => {
      if (statuses) {
        for (const status of statuses) {
          if (typeof status !== 'string' || status.trim() === '') {
            throw new Error('Each status in the list must be a non-empty string');
          }
        }
      }
      return true;
    }),

  validate,
];

module.exports = {
  createSegmentValidationRules,
  updateSegmentValidationRules,
};
