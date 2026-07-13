const Faq = require('../../models/Faq.model');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Get FAQs for Agent Portal (Read-only)
 * GET /api/agent/faqs
 */
const getAgentFaqs = asyncHandler(async (req, res, next) => {
  const faqs = await Faq.find({
    targetPortal: {
      $in: [
        'Both Portals (Client & Agent)',
        'Agent Dashboard Only',
        'both',
        'agent'
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
  getAgentFaqs
};
