const ClientProfile = require('../../models/ClientProfile.model');
const Investment = require('../../models/Investment.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Reusable utility to compute dashboard statistics for a client
 * @param {string} userId - Client User ID
 * @returns {Promise<object>} Dashboard metrics payload
 */
const calculateDashboardData = async (userId) => {
  const profile = await ClientProfile.findOne({ userId });
  if (!profile) {
    throw new AppError('Client profile could not be found for the specified user.', 404);
  }

  // Fetch all investments belonging to the client
  const investments = await Investment.find({ clientId: userId }).sort({ investmentDate: -1 });

  // Filter out cancelled investments for the totals
  const validInvestments = investments.filter(inv => inv.status !== 'cancelled');
  const totalInvestment = validInvestments.reduce((sum, inv) => sum + inv.investmentAmount, 0);

  // Active investments calculations
  const activeInvestmentsList = investments.filter(inv => inv.status === 'active');
  const activeInvestmentsCount = activeInvestmentsList.length;

  // Average ROI percentage of active investments
  let roiAverage = 0;
  if (activeInvestmentsCount > 0) {
    const roiSum = activeInvestmentsList.reduce((sum, inv) => sum + inv.roiPercentage, 0);
    roiAverage = Number((roiSum / activeInvestmentsCount).toFixed(2));
  }

  const documents = {
    panDocument: profile.panDocument,
    aadhaarDocument: profile.aadhaarDocument,
    bankProofDocument: profile.bankProofDocument,
    agreementDocument: profile.agreementDocument,
    nomineeProofDocument: profile.nomineeProofDocument,
  };

  // Compute Next ROI Date
  let nextRoiDate = null;
  if (activeInvestmentsCount > 0) {
    const earliestInvestment = [...activeInvestmentsList].sort((a, b) => new Date(a.investmentDate) - new Date(b.investmentDate))[0];
    const startDate = new Date(earliestInvestment.investmentDate);
    
    // One month from earliest investment
    const oneMonthLater = new Date(startDate);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    const now = new Date();
    if (now < oneMonthLater) {
      // First month: no ROI given, returns null
      nextRoiDate = null;
    } else {
      // Next monthly anniversary from investmentDate
      let candidate = new Date(oneMonthLater);
      while (candidate <= now) {
        candidate.setMonth(candidate.getMonth() + 1);
      }
      nextRoiDate = candidate;
    }
  }

  const formatDateToDDMMMYYYY = (date) => {
    if (!date) return '—';
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const day = String(date.getDate()).padStart(2, '0');
    const monthStr = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${monthStr} ${year}`;
  };

  return {
    profile,
    investments,
    totalInvestment,
    activeInvestments: activeInvestmentsCount,
    roiAverage,
    riskProfile: profile.riskProfile,
    documents,
    nextRoiDate: nextRoiDate ? nextRoiDate.toISOString().split('T')[0] : null,
    nextRoiDateFormatted: nextRoiDate ? formatDateToDDMMMYYYY(nextRoiDate) : '—',
  };
};

/**
 * Get logged-in client dashboard details
 * GET /api/client/dashboard
 */
const getClientDashboard = asyncHandler(async (req, res, next) => {
  const dashboardData = await calculateDashboardData(req.user.id);

  res.status(200).json({
    success: true,
    data: dashboardData,
  });
});

/**
 * Get investments list belonging to logged-in client
 * GET /api/client/investments
 */
const getClientInvestments = asyncHandler(async (req, res, next) => {
  const investments = await Investment.find({ clientId: req.user.id }).sort({ investmentDate: -1 });

  res.status(200).json({
    success: true,
    count: investments.length,
    data: {
      investments,
    },
  });
});

/**
 * Get specific investment details (with ownership security check)
 * GET /api/client/investments/:id
 */
const getClientInvestmentById = asyncHandler(async (req, res, next) => {
  const investment = await Investment.findById(req.params.id);

  if (!investment) {
    return next(new AppError('Investment record not found.', 404));
  }

  // Cross-client access restriction check
  if (investment.clientId.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to view this investment record.', 403));
  }

  res.status(200).json({
    success: true,
    data: {
      investment,
    },
  });
});

/**
 * Get logged-in client profile details
 * GET /api/client/profile
 */
const getClientProfile = asyncHandler(async (req, res, next) => {
  const profile = await ClientProfile.findOne({ userId: req.user.id });
  if (!profile) {
    return next(new AppError('Client profile not found.', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      profile,
    },
  });
});

/**
 * Update client's profile details (enforces non-editable field locks)
 * PATCH /api/client/profile
 */
const updateClientProfile = asyncHandler(async (req, res, next) => {
  // Only phone, address, and nominee details can be updated by the client
  const allowedUpdates = [
    'phone',
    'address',
    'nomineeName',
    'nomineeRelation',
    'nomineePhone',
    'nomineeEmail',
    'nomineeResidency',
  ];

  const updates = {};
  for (const key of Object.keys(req.body)) {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  }

  const profile = await ClientProfile.findOneAndUpdate(
    { userId: req.user.id },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!profile) {
    return next(new AppError('Client profile could not be found.', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      profile,
    },
  });
});

/**
 * Get client uploaded documents
 * GET /api/client/documents
 */
const getClientDocuments = asyncHandler(async (req, res, next) => {
  const profile = await ClientProfile.findOne({ userId: req.user.id });
  if (!profile) {
    return next(new AppError('Client profile not found.', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      panDocument: profile.panDocument,
      aadhaarDocument: profile.aadhaarDocument,
      bankProofDocument: profile.bankProofDocument,
      agreementDocument: profile.agreementDocument,
      nomineeProofDocument: profile.nomineeProofDocument,
    },
  });
});

module.exports = {
  calculateDashboardData,
  getClientDashboard,
  getClientInvestments,
  getClientInvestmentById,
  getClientProfile,
  updateClientProfile,
  getClientDocuments,
};
