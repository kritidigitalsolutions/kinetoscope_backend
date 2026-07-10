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
 * Validation rules for publishing a status update.
 */
const publishUpdateValidationRules = [
  body('status')
    .optional()
    .trim()
    .isString().withMessage('Status must be a string'),

  body('progress')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('Progress must be an integer between 0 and 100'),

  body('notes')
    .notEmpty().withMessage('Notes/status update text is required')
    .isString().withMessage('Notes must be a string'),

  body('attachments')
    .optional()
    .isArray().withMessage('Attachments must be an array of file URL strings'),

  body('applySegmentWide')
    .optional()
    .isBoolean().withMessage('applySegmentWide must be a boolean value'),

  validate,
];

module.exports = {
  publishUpdateValidationRules,
};
