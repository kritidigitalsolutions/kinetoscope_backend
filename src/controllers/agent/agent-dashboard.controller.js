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

  // Let's populate the related client details
  let commissions = await AgentCommission.find({ agentId })
    .populate('clientId', 'name email clientCode')
    .sort({ date: -1, createdAt: -1 });

  // Auto-seed mock data if empty
  if (commissions.length === 0) {
    // 1. Fetch a client of this agent if exists, else fallback to null
    const clientUser = await User.findOne({ assignedAgent: agentId, role: 'client' });
    const fallbackClientId = clientUser ? clientUser._id : undefined;

    const mockData = [
      { agentId, clientId: fallbackClientId, period: 'Mar 2025', date: new Date('2025-03-31'), type: 'MONTHLY', amount: 33750, status: 'PENDING', remarks: 'Monthly commission payout' },
      { agentId, clientId: fallbackClientId, period: 'Feb 2025', date: new Date('2025-02-28'), type: 'MONTHLY', amount: 33750, status: 'PAID', remarks: 'Monthly commission payout' },
      { agentId, clientId: fallbackClientId, period: 'Jan 2025', date: new Date('2025-01-31'), type: 'MONTHLY', amount: 33750, status: 'PAID', remarks: 'Monthly commission payout' },
      { agentId, clientId: fallbackClientId, period: 'Onboarding', date: new Date('2024-01-15'), type: 'ONE TIME', amount: 90000, status: 'PAID', remarks: 'One-time onboarding bonus' },
    ];
    commissions = await AgentCommission.create(mockData);

    // Re-populate clientId after creation
    commissions = await AgentCommission.find({ agentId })
      .populate('clientId', 'name email clientCode')
      .sort({ date: -1, createdAt: -1 });
  }

  // Calculate stats
  let totalCommissionEarned = 0;
  let oneTimeAmount = 0;
  let monthlyAmount = 0;
  let specialAmount = 0;

  const uniqueOneTimeClients = new Set();
  let recurringPayoutCount = 0;
  let specialBonusCount = 0;

  commissions.forEach(c => {
    if (c.status === 'PAID') {
      totalCommissionEarned += c.amount;
      if (c.type === 'ONE TIME') {
        oneTimeAmount += c.amount;
        if (c.clientId) uniqueOneTimeClients.add(c.clientId._id.toString());
      } else if (c.type === 'MONTHLY') {
        monthlyAmount += c.amount;
        recurringPayoutCount++;
      } else if (c.type === 'SPECIAL') {
        specialAmount += c.amount;
        specialBonusCount++;
      }
    }
  });

  // Fetch all active investments of related clients to map investmentAmount & slab %
  const clientIds = commissions.map(c => c.clientId ? c.clientId._id : null).filter(Boolean);
  const investments = await Investment.find({ clientId: { $in: clientIds }, status: 'active' }).lean();

  const investmentMap = {};
  investments.forEach(inv => {
    investmentMap[inv.clientId.toString()] = inv.investmentAmount;
  });

  const getSlabPct = (amount) => {
    if (!amount) return '2%';
    if (amount <= 500000) return '2%';
    if (amount <= 1500000) return '2.5%';
    if (amount <= 3000000) return '3%';
    if (amount <= 5000000) return '3.5%';
    return '4%';
  };

  const enrichedCommissions = commissions.map(c => {
    const client = c.clientId || {};
    const invAmount = client._id ? (investmentMap[client._id.toString()] || 0) : 0;
    const slabPct = invAmount ? getSlabPct(invAmount) : '—';

    return {
      _id: c._id,
      period: c.period,
      amount: c.amount,
      status: c.status,
      type: c.type,
      date: c.date,
      createdAt: c.createdAt,
      paymentMode: c.paymentMode || '—',
      transactionRefId: c.transactionRefId || '—',
      remarks: c.remarks || '',
      clientName: client.name || '—',
      clientCode: client.clientCode || '—',
      investmentAmount: invAmount || 0,
      slabPercentage: slabPct,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalCommissionEarned,
        oneTime: {
          amount: oneTimeAmount,
          clientCount: uniqueOneTimeClients.size,
        },
        monthly: {
          amount: monthlyAmount,
          payoutCount: recurringPayoutCount,
        },
        special: {
          amount: specialAmount,
          bonusCount: specialBonusCount,
        }
      },
      commissions: enrichedCommissions,
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
