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

  // 1) Find all client users assigned to this agent using lean mode
  const clients = await User.find({ role: ROLES.CLIENT, assignedAgent: agentId }).sort({ createdAt: -1 }).lean();
  const clientIds = clients.map(c => c._id);

  if (clientIds.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: {
        clients: [],
      },
    });
  }

  // 2) Fetch agent profile once outside the loop
  const agentProfile = await AgentProfile.findOne({ userId: agentId }).lean();
  const monthlySlabStr = (agentProfile && agentProfile.monthlySlab) ? agentProfile.monthlySlab.replace('%', '') : '0.5';
  const monthlySlabPct = parseFloat(monthlySlabStr) || 0.5;
  const months = 3;

  // 3) Bulk fetch client profiles and active investments in parallel
  const [profiles, investments] = await Promise.all([
    ClientProfile.find({ userId: { $in: clientIds } }).lean(),
    Investment.find({ clientId: { $in: clientIds }, status: 'active' }).lean()
  ]);

  // 4) Map profiles and investments for O(1) in-memory lookup
  const profileMap = {};
  profiles.forEach(p => {
    profileMap[p.userId.toString()] = p;
  });

  const investmentsMap = {};
  clientIds.forEach(id => {
    investmentsMap[id.toString()] = [];
  });
  investments.forEach(inv => {
    const cidStr = inv.clientId.toString();
    if (investmentsMap[cidStr]) {
      investmentsMap[cidStr].push(inv);
    }
  });

  // 5) Assemble client records
  const clientRecords = clients.map(client => {
    const clientIdStr = client._id.toString();
    const profile = profileMap[clientIdStr] || null;
    const clientInvestments = investmentsMap[clientIdStr] || [];
    const totalInvestment = clientInvestments.reduce((sum, inv) => sum + inv.investmentAmount, 0);
    const commissionPaid = totalInvestment * (monthlySlabPct / 100) * months;

    return {
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
      
      // Dual-compatibility nested structure
      user: {
        _id: client._id,
        name: client.name,
        email: client.email,
        clientCode: client.clientCode || '',
        createdAt: client.createdAt,
      },
      profile: {
        _id: profile ? profile._id : null,
        phone: profile ? profile.phone : '',
        status: profile ? profile.status : 'active',
        monthlyRoi: profile ? profile.monthlyRoi : 1.2,
      },
    };
  });

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
      { agentId, period: 'Jan 2025', date: new Date('2025-01-31'), type: 'MONTHLY', amount: 33750, status: 'PAID', remarks: 'Monthly commission payout' },
      { agentId, period: 'Feb 2025', date: new Date('2025-02-28'), type: 'MONTHLY', amount: 33750, status: 'PAID', remarks: 'Monthly commission payout' },
      { agentId, period: 'Mar 2025', date: new Date('2025-03-31'), type: 'MONTHLY', amount: 33750, status: 'PAID', remarks: 'Monthly commission payout' },
      { agentId, period: 'Apr 2025', date: new Date('2025-04-30'), type: 'MONTHLY', amount: 33750, status: 'PAID', remarks: 'Monthly commission payout' },
      { agentId, period: 'May 2025', date: new Date('2025-05-31'), type: 'MONTHLY', amount: 33750, status: 'PENDING', remarks: 'Monthly commission payout' },
      { agentId, period: 'Jan 2024', date: new Date('2024-01-15'), type: 'ONE TIME', amount: 900000, status: 'PAID', remarks: 'One-time onboarding bonus' },
      { agentId, period: 'Aug 2025', date: new Date('2025-08-10'), type: 'SPECIAL', amount: 16250, status: 'PAID', remarks: 'Independence Day special bonus' },
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
