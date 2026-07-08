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
 * Validation rules for creating a new project.
 */
const createProjectValidationRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Project name is required')
    .isString().withMessage('Name must be a string'),

  body('segment')
    .trim()
    .notEmpty().withMessage('Segment is required')
    .isString().withMessage('Segment must be a string'),

  body('status')
    .trim()
    .notEmpty().withMessage('Status is required')
    .isString().withMessage('Status must be a string'),

  body('portfolioValue')
    .trim()
    .notEmpty().withMessage('Portfolio value description is required')
    .isString().withMessage('Portfolio value must be a string'),

  body('monthlyRoi')
    .trim()
    .notEmpty().withMessage('Monthly ROI description is required')
    .isString().withMessage('Monthly ROI must be a string'),

  body('riskLevel')
    .optional()
    .trim()
    .isIn(['Low', 'Medium', 'High']).withMessage('Risk Level must be either Low, Medium, or High'),

  body('milestoneProgress')
    .optional()
    .customSanitizer(val => {
      if (typeof val === 'string') {
        const cleaned = val.replace(/[^0-9]/g, '');
        return cleaned ? parseInt(cleaned, 10) : 0;
      }
      return val;
    })
    .isInt({ min: 0, max: 100 }).withMessage('Milestone progress must be between 0 and 100'),

  body('mediaFiles')
    .optional()
    .isArray().withMessage('Media files must be an array of string URLs'),

  body('health')
    .optional()
    .trim()
    .isIn(['On Track', 'Performing', 'At Risk', 'Under Review']).withMessage('Health must be either On Track, Performing, At Risk, or Under Review'),

  body('summary')
    .optional()
    .trim()
    .isString().withMessage('Summary must be a string'),

  validate,
];

/**
 * Validation rules for updating an existing project.
 */
const updateProjectValidationRules = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Project name cannot be empty')
    .isString().withMessage('Name must be a string'),

  body('segment')
    .optional()
    .trim()
    .notEmpty().withMessage('Segment cannot be empty')
    .isString().withMessage('Segment must be a string'),

  body('status')
    .optional()
    .trim()
    .notEmpty().withMessage('Status cannot be empty')
    .isString().withMessage('Status must be a string'),

  body('portfolioValue')
    .optional()
    .trim()
    .notEmpty().withMessage('Portfolio value description cannot be empty')
    .isString().withMessage('Portfolio value must be a string'),

  body('monthlyRoi')
    .optional()
    .trim()
    .notEmpty().withMessage('Monthly ROI description cannot be empty')
    .isString().withMessage('Monthly ROI must be a string'),

  body('riskLevel')
    .optional()
    .trim()
    .isIn(['Low', 'Medium', 'High']).withMessage('Risk Level must be either Low, Medium, or High'),

  body('milestoneProgress')
    .optional()
    .customSanitizer(val => {
      if (typeof val === 'string') {
        const cleaned = val.replace(/[^0-9]/g, '');
        return cleaned ? parseInt(cleaned, 10) : 0;
      }
      return val;
    })
    .isInt({ min: 0, max: 100 }).withMessage('Milestone progress must be between 0 and 100'),

  body('mediaFiles')
    .optional()
    .isArray().withMessage('Media files must be an array of string URLs'),

  body('health')
    .optional()
    .trim()
    .isIn(['On Track', 'Performing', 'At Risk', 'Under Review']).withMessage('Health must be either On Track, Performing, At Risk, or Under Review'),

  body('summary')
    .optional()
    .trim()
    .isString().withMessage('Summary must be a string'),

  validate,
];

module.exports = {
  createProjectValidationRules,
  updateProjectValidationRules,
};
