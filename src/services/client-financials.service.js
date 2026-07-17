const User = require('../models/User.model');
const ClientProfile = require('../models/ClientProfile.model');
const Investment = require('../models/Investment.model');
const RoiPayout = require('../models/RoiPayout.model');
const AppError = require('../utils/AppError');
const { ROLES } = require('../constants/roles');

/**
 * Fetch and calculate metrics for the client investments tab.
 *
 * @param {string} clientId - Client User ID
 * @returns {Promise<Object>} Object containing totalInvestment, activeInvestments, and the list of investments
 */
const getInvestmentsTab = async (clientId) => {
  const user = await User.findById(clientId);
  if (!user || user.role !== ROLES.CLIENT) {
    throw new AppError('Client account not found.', 404);
  }

  const investments = await Investment.find({ clientId }).sort({ investmentDate: -1 });

  // Calculate aggregates
  const validInvestments = investments.filter(inv => inv.status !== 'cancelled');
  const totalInvestment = validInvestments.reduce((sum, inv) => sum + inv.investmentAmount, 0);
  const activeInvestmentsCount = investments.filter(inv => inv.status === 'active').length;

  const formattedInvestments = investments.map(inv => ({
    _id: inv._id,
    clientId: inv.clientId,
    clientName: inv.clientName,
    clientCode: inv.clientCode,
    segment: inv.segment,
    investmentAmount: inv.investmentAmount,
    roiPercentage: inv.roiPercentage,
    riskPercentage: inv.riskPercentage,
    investmentDate: inv.investmentDate,
    allocationDate: inv.investmentDate,
    status: (inv.status || 'active').toUpperCase(),
    remarks: inv.remarks,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  }));

  return {
    totalInvestment,
    activeInvestments: activeInvestmentsCount,
    investments: formattedInvestments,
  };
};

/**
 * Fetch and calculate metrics for the client ROI payouts tab.
 *
 * @param {string} clientId - Client User ID
 * @returns {Promise<Object>} Object containing totalRoiPaid, totalRoiPending, and the payouts history list
 */
const getRoiTab = async (clientId) => {
  const user = await User.findById(clientId);
  if (!user || user.role !== ROLES.CLIENT) {
    throw new AppError('Client account not found.', 404);
  }

  const profile = await ClientProfile.findOne({ userId: clientId });
  const roiRate = profile ? (profile.monthlyRoi || 1.2) : 1.2;

  // Fetch all payout distributions for this client
  const payouts = await RoiPayout.find({ clientId }).sort({ createdAt: 1 });

  // Calculate aggregates
  const totalRoiPaid = payouts
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalRoiPending = payouts
    .filter(p => p.status === 'PENDING')
    .reduce((sum, p) => sum + p.amount, 0);

  // Enrich payouts with roiRate and formatted processedDate
  const enrichedPayouts = payouts.map(p => ({
    _id: p._id,
    clientId: p.clientId,
    payoutMonth: p.payoutMonth,
    amount: p.amount,
    status: p.status,
    processedDate: p.processedDate ? p.processedDate.toISOString().split('T')[0] : '—',
    roiRate: `${roiRate}%`,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  return {
    totalRoiPaid,
    totalRoiPending,
    roiHistory: enrichedPayouts,
  };
};

/**
 * Mark a pending ROI payout as paid.
 *
 * @param {string} clientId - Client User ID
 * @param {string} payoutId - ROI Payout ID to transition
 * @returns {Promise<Object>} The updated RoiPayout object
 */
const payRoiPayout = async (clientId, payoutId) => {
  let payout;
  const isObjectId = mongoose.Types.ObjectId.isValid(payoutId);

  if (isObjectId) {
    payout = await RoiPayout.findOne({ _id: payoutId, clientId });
    if (!payout) {
      throw new AppError('ROI payout record not found for this client.', 404);
    }
    if (payout.status === 'PAID') {
      throw new AppError('ROI payout is already marked as PAID.', 400);
    }
    payout.status = 'PAID';
    payout.processedDate = new Date();
    await payout.save();
  } else {
    // Custom/string formatted ID (like "201"). Query raw collection directly to avoid Mongoose ObjectId cast error.
    const clientObjectId = mongoose.Types.ObjectId.isValid(clientId) ? new mongoose.Types.ObjectId(clientId) : clientId;
    const rawPayout = await RoiPayout.collection.findOne({ _id: payoutId, clientId: clientObjectId });
    if (!rawPayout) {
      throw new AppError('ROI payout record not found for this client.', 404);
    }
    if (rawPayout.status === 'PAID') {
      throw new AppError('ROI payout is already marked as PAID.', 400);
    }
    
    await RoiPayout.collection.updateOne(
      { _id: payoutId, clientId: clientObjectId },
      { $set: { status: 'PAID', processedDate: new Date() } }
    );
    
    const updatedRaw = await RoiPayout.collection.findOne({ _id: payoutId, clientId: clientObjectId });
    payout = RoiPayout.hydrate(updatedRaw);
  }

  return payout;
};

module.exports = {
  getInvestmentsTab,
  getRoiTab,
  payRoiPayout,
};
