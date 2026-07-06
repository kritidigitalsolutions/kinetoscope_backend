
const financialsService = require('../../services/client-financials.service');
const clientDetailsService = require('../../services/client-details.service');
const perksService = require('../../services/perks.service');
const ClientProfile = require('../../models/ClientProfile.model');
const User = require('../../models/User.model');
const { sendRoiPayoutNotification } = require('../../services/email.service');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

/**
 * Get client investments tab data
 * GET /api/super-admin/clients/:id/investments
 */
const getClientInvestmentsTab = asyncHandler(async (req, res, next) => {
  const data = await financialsService.getInvestmentsTab(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Client investments retrieved successfully',
    data,
  });
});

/**
 * Get client ROI tab data
 * GET /api/super-admin/clients/:id/roi
 */
const getClientRoiTab = asyncHandler(async (req, res, next) => {
  const data = await financialsService.getRoiTab(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Client ROI payouts retrieved successfully',
    data,
  });
});

/**
 * Mark a client's pending ROI payout as paid
 * PATCH /api/super-admin/clients/:id/roi/:payoutId/pay
 */
const markRoiPaid = asyncHandler(async (req, res, next) => {
  const { id: clientId, payoutId } = req.params;

  const updatedPayout = await financialsService.payRoiPayout(clientId, payoutId);

  // Send automated email notification
  try {
    const clientUser = await User.findById(clientId);
    if (clientUser && clientUser.email) {
      let agentEmail = null;
      if (clientUser.assignedAgent) {
        const agent = await User.findById(clientUser.assignedAgent);
        if (agent) agentEmail = agent.email;
      }

      sendRoiPayoutNotification(
        clientUser.email,
        clientUser.name,
        agentEmail,
        updatedPayout
      ).catch((err) =>
        console.error('[ROI Notification Error]:', err.message)
      );
    }
  } catch (error) {
    console.error('[ROI Notification Processing Error]:', error.message);
  }

  res.status(200).json({
    success: true,
    message: 'ROI payout marked as PAID successfully',
    data: {
      payout: updatedPayout,
    },
  });
});

/**
 * Get client documents tab data
 * GET /api/super-admin/clients/:id/documents
 */
const getClientDocumentsTab = asyncHandler(async (req, res, next) => {
  const documentsData = await clientDetailsService.getClientDocumentsData(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Client documents retrieved successfully',
    data: documentsData,
  });
});

/**
 * Get client perks tab data
 * GET /api/super-admin/clients/:id/perks
 */
const getClientPerksTab = asyncHandler(async (req, res, next) => {
  const profile = await ClientProfile.findOne({ userId: req.params.id });
  if (!profile) {
    return next(new AppError('Client profile not found.', 404));
  }

  const perks = perksService.getPerksByTier(profile.tier);

  res.status(200).json({
    success: true,
    message: 'Client perks retrieved successfully',
    data: {
      perks,
    },
  });
});

module.exports = {
  getClientInvestmentsTab,
  getClientRoiTab,
  markRoiPaid,
  getClientDocumentsTab,
  getClientPerksTab,
};
