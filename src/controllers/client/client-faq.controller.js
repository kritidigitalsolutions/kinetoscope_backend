const Faq = require('../../models/Faq.model');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Get FAQs for Client Portal (Read-only)
 * GET /api/client/faqs
 */
const getClientFaqs = asyncHandler(async (req, res, next) => {
  const faqs = await Faq.find({
    targetPortal: {
      $in: [
        'Both Portals (Client & Agent)',
        'Client Dashboard Only',
        'both',
        'client'
      ]
    }
  }).sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    count: faqs.length,
    data: faqs
  });
});

module.exports = {
  getClientFaqs
};
