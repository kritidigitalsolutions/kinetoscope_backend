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
 * Validation rules for updating the Rewards Configuration.
 */
const updateRewardsConfigRules = [
  body('referralBonusPercentage')
    .optional()
    .isNumeric().withMessage('Referral bonus percentage must be a number')
    .isFloat({ min: 0 }).withMessage('Referral bonus percentage cannot be negative'),

  body('milestoneAmount')
    .optional()
    .isNumeric().withMessage('Milestone investment amount must be a number')
    .isFloat({ min: 0 }).withMessage('Milestone investment amount cannot be negative'),

  body('milestoneRewardPercentage')
    .optional()
    .isNumeric().withMessage('Milestone reward percentage must be a number')
    .isFloat({ min: 0 }).withMessage('Milestone reward percentage cannot be negative'),

  body('minWithdrawalLimit')
    .optional()
    .isNumeric().withMessage('Minimum withdrawal limit must be a number')
    .isFloat({ min: 0 }).withMessage('Minimum withdrawal limit cannot be negative'),

  validate,
];

module.exports = {
  updateRewardsConfigRules,
};
