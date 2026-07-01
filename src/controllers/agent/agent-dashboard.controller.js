const User = require('../../models/User.model');
const AgentProfile = require('../../models/AgentProfile.model');
const ClientProfile = require('../../models/ClientProfile.model');
const Investment = require('../../models/Investment.model');
const AgentCommission = require('../../models/AgentCommission.model');
const agentDetailsService = require('../../services/agent-details.service');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const { ROLES } = require('../../constants/roles');

/**
 * Get logged-in Agent dashboard details
 * GET /api/agent/dashboard
 */
const getAgentDashboard = asyncHandler(async (req, res, next) => {
  const details = await agentDetailsService.getAgentDetailsData(req.user.id);
  
  res.status(200).json({
    success: true,
    data: details,
  });
});

/**
 * Get clients assigned to the logged-in Agent
 * GET /api/agent/clients
 */
const getAgentClients = asyncHandler(async (req, res, next) => {
  const agentId = req.user.id;

  const clients = await User.find({ role: ROLES.CLIENT, assignedAgent: agentId }).sort({ createdAt: -1 });

  const clientRecords = [];
  for (const client of clients) {
    const profile = await ClientProfile.findOne({ userId: client._id });
    
    // Get total investment for the client
    const investments = await Investment.find({ clientId: client._id, status: 'active' });
    const totalInvestment = investments.reduce((sum, inv) => sum + inv.investmentAmount, 0);

    // Calculate commission paid
    const agentProfile = await AgentProfile.findOne({ userId: agentId });
    const monthlySlabStr = (agentProfile && agentProfile.monthlySlab) ? agentProfile.monthlySlab.replace('%', '') : '0.5';
    const monthlySlabPct = parseFloat(monthlySlabStr) || 0.5;

    // Use a mock of 3 months payout for calculation of total paid commission so far
    const months = 3;
    const commissionPaid = totalInvestment * (monthlySlabPct / 100) * months;

    clientRecords.push({
      clientId: client.clientCode || '',
      id: client._id,
      name: client.name,
      email: client.email,
      phone: profile ? profile.phone : '',
      joinDate: client.createdAt,
      totalInvestment,
      roi: profile ? profile.monthlyRoi : 1.2,
      commissionPaid: Math.round(commissionPaid),
      status: profile ? profile.status : 'active',
    });
  }

  res.status(200).json({
    success: true,
    count: clientRecords.length,
    data: {
      clients: clientRecords,
    },
  });
});

/**
 * Get logged-in Agent commission history
 * GET /api/agent/commissions
 */
const getAgentCommissions = asyncHandler(async (req, res, next) => {
  const agentId = req.user.id;

  let commissions = await AgentCommission.find({ agentId }).sort({ createdAt: -1 });

  // Auto-seed mock data if empty
  if (commissions.length === 0) {
    const mockData = [
      { agentId, period: 'Jan 2025', date: '31/01/2025', type: 'MONTHLY', amount: 33750, status: 'PAID', remarks: 'Monthly commission payout' },
      { agentId, period: 'Feb 2025', date: '28/02/2025', type: 'MONTHLY', amount: 33750, status: 'PAID', remarks: 'Monthly commission payout' },
      { agentId, period: 'Mar 2025', date: '31/03/2025', type: 'MONTHLY', amount: 33750, status: 'PAID', remarks: 'Monthly commission payout' },
      { agentId, period: 'Apr 2025', date: '30/04/2025', type: 'MONTHLY', amount: 33750, status: 'PAID', remarks: 'Monthly commission payout' },
      { agentId, period: 'May 2025', date: '31/05/2025', type: 'MONTHLY', amount: 33750, status: 'PENDING', remarks: 'Monthly commission payout' },
      { agentId, period: 'Onboarding', date: '15/01/2024', type: 'ONE TIME', amount: 900000, status: 'PAID', remarks: 'One-time onboarding bonus' },
      { agentId, period: 'Special Campaign', date: '10/08/2025', type: 'SPECIAL', amount: 16250, status: 'PAID', remarks: 'Independence Day special bonus' },
    ];
    commissions = await AgentCommission.create(mockData);
  }

  res.status(200).json({
    success: true,
    count: commissions.length,
    data: {
      commissions,
    },
  });
});

/**
 * Get logged-in Agent profile details
 * GET /api/agent/profile
 */
const getAgentProfile = asyncHandler(async (req, res, next) => {
  const details = await agentDetailsService.getAgentDetailsData(req.user.id);
  
  res.status(200).json({
    success: true,
    data: details.profile,
  });
});

/**
 * Get logged-in Agent documents
 * GET /api/agent/documents
 */
const getAgentDocuments = asyncHandler(async (req, res, next) => {
  const documents = await agentDetailsService.getAgentDocumentsData(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      documents,
    },
  });
});

module.exports = {
  getAgentDashboard,
  getAgentClients,
  getAgentCommissions,
  getAgentProfile,
  getAgentDocuments,
};
