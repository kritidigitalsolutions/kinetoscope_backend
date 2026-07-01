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
 * Validation rules for onboarding a new agent (multipart/form-data text fields)
 */
const createAgentValidationRules = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ max: 50 }).withMessage('Full name cannot exceed 50 characters'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('residencyStatus')
    .trim()
    .notEmpty().withMessage('Residency / Citizenship is required')
    .isIn(['National (Domestic)', 'International']).withMessage('Residency must be either National (Domestic) or International'),
  body('panNumber')
    .trim()
    .notEmpty().withMessage('PAN / Tax ID number is required')
    .custom((value, { req }) => {
      if (req.body.residencyStatus === 'International') {
        return true;
      }
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value.toUpperCase())) {
        throw new Error('Please provide a valid 10-character alphanumeric PAN number');
      }
      return true;
    }),
  body('aadhaarNumber')
    .trim()
    .notEmpty().withMessage('Aadhaar / Passport number is required')
    .custom((value, { req }) => {
      if (req.body.residencyStatus === 'International') {
        return true;
      }
      if (!/^\d{12}$/.test(value)) {
        throw new Error('Please provide a valid 12-digit Aadhaar number');
      }
      return true;
    }),

  body('bankName')
    .trim()
    .notEmpty().withMessage('Bank name is required'),
  body('accountNumber')
    .trim()
    .notEmpty().withMessage('Account number is required'),
  body('ifscCode')
    .trim()
    .notEmpty().withMessage('IFSC / SWIFT code is required')
    .custom((value, { req }) => {
      if (req.body.residencyStatus === 'International') {
        return true;
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.toUpperCase())) {
        throw new Error('Please provide a valid 11-character alphanumeric IFSC code');
      }
      return true;
    }),
  body('oneTimeCommission')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('One-time commission must be a number')
    .isFloat({ min: 0 }).withMessage('One-time commission must be a non-negative number'),
  body('monthlySlab')
    .optional({ checkFalsy: true })
    .trim(),
  body('specialCommission')
    .optional({ checkFalsy: true })
    .isNumeric().withMessage('Special commission must be a number')
    .isFloat({ min: 0 }).withMessage('Special commission must be a non-negative number'),
  body('nomineeName')
    .trim()
    .notEmpty().withMessage('Nominee name is required'),
  body('nomineeRelation')
    .trim()
    .notEmpty().withMessage('Nominee relation is required'),
  body('nomineePhone')
    .trim()
    .notEmpty().withMessage('Nominee phone number is required'),
  body('nomineeEmail')
    .trim()
    .notEmpty().withMessage('Nominee email address is required')
    .isEmail().withMessage('Please provide a valid nominee email address')
    .normalizeEmail(),
  body('nomineeResidency')
    .trim()
    .notEmpty().withMessage('Nominee Residency / Citizenship is required')
    .isIn(['National (Domestic)', 'International']).withMessage('Nominee Residency must be either National (Domestic) or International'),
  body('password')
    .optional({ checkFalsy: true })
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('portalPassword')
    .optional({ checkFalsy: true })
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  validate,
];

/**
 * Validation rules for admin-initiated agent updates
 */
const updateAgentRulesByAdmin = [
  body('fullName')
    .optional()
    .trim()
    .notEmpty().withMessage('Full name cannot be empty'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .notEmpty().withMessage('Phone number cannot be empty'),
  body('residencyStatus')
    .optional()
    .isIn(['National (Domestic)', 'International']).withMessage('Residency must be either National (Domestic) or International'),
  body('panNumber')
    .optional()
    .trim()
    .custom(async (value, { req }) => {
      let resStatus = req.body.residencyStatus;
      if (!resStatus) {
        const AgentProfile = require('../../models/AgentProfile.model');
        const profile = await AgentProfile.findOne({ userId: req.params.id });
        resStatus = profile ? profile.residencyStatus : 'National (Domestic)';
      }
      if (resStatus === 'International') {
        return true;
      }
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value.toUpperCase())) {
        throw new Error('Please provide a valid 10-character alphanumeric PAN number');
      }
      return true;
    }),
  body('aadhaarNumber')
    .optional()
    .trim()
    .custom(async (value, { req }) => {
      let resStatus = req.body.residencyStatus;
      if (!resStatus) {
        const AgentProfile = require('../../models/AgentProfile.model');
        const profile = await AgentProfile.findOne({ userId: req.params.id });
        resStatus = profile ? profile.residencyStatus : 'National (Domestic)';
      }
      if (resStatus === 'International') {
        return true;
      }
      if (!/^\d{12}$/.test(value)) {
        throw new Error('Please provide a valid 12-digit Aadhaar number');
      }
      return true;
    }),

  body('bankName')
    .optional()
    .trim()
    .notEmpty().withMessage('Bank name cannot be empty'),
  body('accountNumber')
    .optional()
    .trim()
    .notEmpty().withMessage('Account number cannot be empty'),
  body('ifscCode')
    .optional()
    .trim()
    .custom(async (value, { req }) => {
      let resStatus = req.body.residencyStatus;
      if (!resStatus) {
        const AgentProfile = require('../../models/AgentProfile.model');
        const profile = await AgentProfile.findOne({ userId: req.params.id });
        resStatus = profile ? profile.residencyStatus : 'National (Domestic)';
      }
      if (resStatus === 'International') {
        return true;
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.toUpperCase())) {
        throw new Error('Please provide a valid IFSC code');
      }
      return true;
    }),
  body('oneTimeCommission')
    .optional({ nullable: true })
    .isNumeric().withMessage('One-time commission must be a number')
    .isFloat({ min: 0 }).withMessage('One-time commission must be a non-negative number'),
  body('monthlySlab')
    .optional({ nullable: true })
    .trim(),
  body('specialCommission')
    .optional({ nullable: true })
    .isNumeric().withMessage('Special commission must be a number')
    .isFloat({ min: 0 }).withMessage('Special commission must be a non-negative number'),
  body('nomineeName')
    .optional()
    .trim()
    .notEmpty().withMessage('Nominee name cannot be empty'),
  body('nomineeRelation')
    .optional()
    .trim()
    .notEmpty().withMessage('Nominee relation cannot be empty'),
  body('nomineePhone')
    .optional()
    .trim()
    .notEmpty().withMessage('Nominee phone number cannot be empty'),
  body('nomineeEmail')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid nominee email address')
    .normalizeEmail(),
  body('nomineeResidency')
    .optional()
    .isIn(['National (Domestic)', 'International']).withMessage('Nominee Residency must be either National (Domestic) or International'),
  body('status')
    .optional()
    .custom(val => {
      const lower = val.toLowerCase();
      if (!['active', 'inactive', 'suspended', 'blocked', 'hold'].includes(lower)) {
        throw new Error('Status must be active, inactive, suspended, blocked, or hold');
      }
      return true;
    }),
  body('password')
    .optional({ checkFalsy: true })
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('portalPassword')
    .optional({ checkFalsy: true })
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  validate,
];

module.exports = {
  createAgentValidationRules,
  updateAgentRulesByAdmin,
};
