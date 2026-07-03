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
 * Validation rules for creating a new article.
 */
const createArticleValidationRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Article title is required')
    .isString().withMessage('Title must be a string'),

  body('content')
    .notEmpty().withMessage('Article content is required')
    .isString().withMessage('Content must be a string'),

  body('category')
    .trim()
    .notEmpty().withMessage('Category is required')
    .isString().withMessage('Category must be a string'),

  body('author')
    .trim()
    .notEmpty().withMessage('Author name is required')
    .isString().withMessage('Author must be a string'),

  body('status')
    .optional()
    .isIn(['Draft', 'Published']).withMessage('Status must be either Draft or Published'),

  body('publishDate')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Publish date must be a valid ISO 8601 date'),

  body('excerpt')
    .optional()
    .trim()
    .isString().withMessage('Excerpt must be a string'),

  body('specialQuote')
    .optional()
    .trim()
    .isString().withMessage('Special Quote must be a string'),

  body('quoteAuthorRole')
    .optional()
    .trim()
    .isString().withMessage('Quote Author/Role must be a string'),

  body('advisoryNotice')
    .optional()
    .trim()
    .isString().withMessage('Advisory Notice must be a string'),

  validate,
];

/**
 * Validation rules for updating an article.
 */
const updateArticleValidationRules = [
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Article title cannot be empty')
    .isString().withMessage('Title must be a string'),

  body('content')
    .optional()
    .notEmpty().withMessage('Article content cannot be empty')
    .isString().withMessage('Content must be a string'),

  body('category')
    .optional()
    .trim()
    .notEmpty().withMessage('Category cannot be empty')
    .isString().withMessage('Category must be a string'),

  body('author')
    .optional()
    .trim()
    .notEmpty().withMessage('Author name cannot be empty')
    .isString().withMessage('Author must be a string'),

  body('status')
    .optional()
    .isIn(['Draft', 'Published']).withMessage('Status must be either Draft or Published'),

  body('publishDate')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Publish date must be a valid ISO 8601 date'),

  body('excerpt')
    .optional()
    .trim()
    .isString().withMessage('Excerpt must be a string'),

  body('specialQuote')
    .optional()
    .trim()
    .isString().withMessage('Special Quote must be a string'),

  body('quoteAuthorRole')
    .optional()
    .trim()
    .isString().withMessage('Quote Author/Role must be a string'),

  body('advisoryNotice')
    .optional()
    .trim()
    .isString().withMessage('Advisory Notice must be a string'),

  validate,
];

module.exports = {
  createArticleValidationRules,
  updateArticleValidationRules,
};
