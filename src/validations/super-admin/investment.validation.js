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
 * Validation rules for assigning a new investment.
 * Investment records are immutable — no update or delete rules required.
 */
const createInvestmentValidationRules = [
  body('clientId')
    .notEmpty().withMessage('Client ID is required')
    .isMongoId().withMessage('Client ID must be a valid MongoDB ObjectId'),



  body('segment')
    .trim()
    .notEmpty().withMessage('Segment is required')
    .isString().withMessage('Segment must be a string'),

  body('investmentAmount')
    .notEmpty().withMessage('Investment amount is required')
    .isNumeric().withMessage('Investment amount must be a number')
    .isFloat({ min: 0.01 }).withMessage('Investment amount must be a positive number (minimum 0.01)'),

  body('roiPercentage')
    .notEmpty().withMessage('ROI percentage is required')
    .isNumeric().withMessage('ROI percentage must be a number')
    .isFloat({ min: 0 }).withMessage('ROI percentage must be a non-negative number'),

  body('riskPercentage')
    .notEmpty().withMessage('Risk percentage is required')
    .isNumeric().withMessage('Risk percentage must be a number')
    .isFloat({ min: 0 }).withMessage('Risk percentage must be a non-negative number'),

  body('investmentDate')
    .optional()
    .isISO8601().withMessage('Investment date must be a valid ISO 8601 date'),

  body('status')
    .optional()
    .isIn(['active', 'completed', 'cancelled']).withMessage('Status must be active, completed, or cancelled'),

  body('remarks')
    .optional()
    .isString().withMessage('Remarks must be a string'),

  validate,
];

module.exports = {
  createInvestmentValidationRules,
};
