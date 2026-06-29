const { body, validationResult } = require('express-validator');
const AppError = require('../../utils/AppError');

/**
 * Common validation parser middleware to accumulate express-validator errors.
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
 * Validation rules for updating client account status
 * PATCH /api/super-admin/client-portal/:clientId/status
 */
const updateClientStatusRules = [
  body('status')
    .trim()
    .notEmpty().withMessage('Status is required')
    .custom(val => {
      const lower = val.toLowerCase();
      if (!['active', 'inactive', 'suspended', 'blocked', 'hold'].includes(lower)) {
        throw new Error('Status must be one of: active, inactive, suspended, blocked, hold');
      }
      return true;
    }),
  validate,
];

module.exports = {
  updateClientStatusRules,
};
