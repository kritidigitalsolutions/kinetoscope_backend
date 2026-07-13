const Faq = require('../../models/Faq.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Create a new FAQ entry (Super Admin only)
 * POST /api/super-admin/faqs
 */
const createFaq = asyncHandler(async (req, res, next) => {
  const { question, answer, targetPortal } = req.body;

  if (!question || !answer) {
    return next(new AppError('Please provide both a question and an answer.', 400));
  }

  const faq = await Faq.create({
    question,
    answer,
    targetPortal: targetPortal || 'Both Portals (Client & Agent)'
  });

  res.status(201).json({
    success: true,
    message: 'FAQ entry created successfully.',
    data: faq
  });
});

/**
 * Get all FAQ entries (Super Admin only)
 * GET /api/super-admin/faqs
 */
const getAllFaqs = asyncHandler(async (req, res, next) => {
  const faqs = await Faq.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: faqs.length,
    data: faqs
  });
});

/**
 * Update an existing FAQ entry (Super Admin only)
 * PATCH /api/super-admin/faqs/:id
 */
const updateFaq = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { question, answer, targetPortal } = req.body;

  const faq = await Faq.findById(id);
  if (!faq) {
    return next(new AppError('FAQ entry not found.', 404));
  }

  if (question !== undefined) faq.question = question;
  if (answer !== undefined) faq.answer = answer;
  if (targetPortal !== undefined) faq.targetPortal = targetPortal;

  await faq.save();

  res.status(200).json({
    success: true,
    message: 'FAQ entry updated successfully.',
    data: faq
  });
});

/**
 * Delete a single FAQ entry (Super Admin only)
 * DELETE /api/super-admin/faqs/:id
 */
const deleteFaq = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const faq = await Faq.findByIdAndDelete(id);
  if (!faq) {
    return next(new AppError('FAQ entry not found.', 404));
  }

  res.status(200).json({
    success: true,
    message: 'FAQ entry deleted successfully.',
    data: faq
  });
});

module.exports = {
  createFaq,
  getAllFaqs,
  updateFaq,
  deleteFaq
};
