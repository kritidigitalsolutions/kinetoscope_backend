const { body, validationResult } = require('express-validator');
const AppError = require('../../utils/AppError');
const mongoose = require('mongoose');

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
 * Helper to validate minimum investment tier ranges
 * Silver: 0 to 25 Lakh (0 to 2,500,000)
 * Gold: 25 Lakh to 1 Crore (2,500,000 to 10,000,000)
 * Platinum: 1 Crore to 3 Crore (10,000,000 to 30,000,000)
 * Diamond: 3 Crore + (30,000,000+)
 */
const validateTierMinInvestmentRange = (value, { req }) => {
  const minInv = Number(value);
  const tier = req.body.tier;
  if (!tier) return true;

  const upperTier = tier.toUpperCase();

  if (upperTier === 'SILVER') {
    if (minInv < 0 || minInv > 2500000) {
      throw new Error('For SILVER tier, minimum investment must be between ₹0 and ₹25 Lakhs (2,500,000)');
    }
  } else if (upperTier === 'GOLD') {
    if (minInv < 2500000 || minInv > 10000000) {
      throw new Error('For GOLD tier, minimum investment must be between ₹25 Lakhs (2,500,000) and ₹1 Crore (10,000,000)');
    }
  } else if (upperTier === 'PLATINUM') {
    if (minInv < 10000000 || minInv > 30000000) {
      throw new Error('For PLATINUM tier, minimum investment must be between ₹1 Crore (10,000,000) and ₹3 Crores (30,000,000)');
    }
  } else if (upperTier === 'DIAMOND') {
    if (minInv < 30000000) {
      throw new Error('For DIAMOND tier, minimum investment must be ₹3 Crores (30,000,000) or more');
    }
  }
  return true;
};

/**
 * Validation rules for creating a new perk definition.
 */
const createPerkValidationRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Perk title is required')
    .isString().withMessage('Title must be a string'),

  body('description')
    .trim()
    .notEmpty().withMessage('Perk description is required')
    .isString().withMessage('Description must be a string'),

  body('tier')
    .trim()
    .notEmpty().withMessage('Tier is required')
    .isIn(['DIAMOND', 'PLATINUM', 'GOLD', 'SILVER']).withMessage('Tier must be one of: DIAMOND, PLATINUM, GOLD, or SILVER'),

  body('minInvestment')
    .optional()
    .isNumeric().withMessage('Minimum investment must be a number')
    .isFloat({ min: 0 }).withMessage('Minimum investment must be a non-negative number')
    .custom(validateTierMinInvestmentRange),

  body('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('Status must be either active or inactive'),

  validate,
];

/**
 * Validation rules for updating a perk definition.
 */
const updatePerkValidationRules = [
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Perk title cannot be empty')
    .isString().withMessage('Title must be a string'),

  body('description')
    .optional()
    .trim()
    .notEmpty().withMessage('Perk description cannot be empty')
    .isString().withMessage('Description must be a string'),

  body('tier')
    .optional()
    .trim()
    .isIn(['DIAMOND', 'PLATINUM', 'GOLD', 'SILVER']).withMessage('Tier must be one of: DIAMOND, PLATINUM, GOLD, or SILVER'),

  body('minInvestment')
    .optional()
    .isNumeric().withMessage('Minimum investment must be a number')
    .isFloat({ min: 0 }).withMessage('Minimum investment must be a non-negative number')
    .custom(validateTierMinInvestmentRange),

  body('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('Status must be either active or inactive'),

  validate,
];

/**
 * Validation rules for assigning a perk to clients.
 */
const assignPerkValidationRules = [
  body('perkId')
    .notEmpty().withMessage('Perk ID is required')
    .isMongoId().withMessage('Perk ID must be a valid MongoDB ObjectId'),

  body('clientIds')
    .notEmpty().withMessage('Client IDs list is required')
    .isArray().withMessage('Client IDs must be an array of MongoDB IDs')
    .custom((clientIds) => {
      if (clientIds.length === 0) {
        throw new Error('At least one Client ID must be specified');
      }
      for (const id of clientIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error(`Invalid Client ID: ${id}`);
        }
      }
      return true;
    }),

  validate,
];

module.exports = {
  createPerkValidationRules,
  updatePerkValidationRules,
  assignPerkValidationRules,
};
