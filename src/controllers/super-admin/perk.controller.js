const Perk = require('../../models/Perk.model');
const ClientPerk = require('../../models/ClientPerk.model');
const User = require('../../models/User.model');
const ClientProfile = require('../../models/ClientProfile.model');
const Investment = require('../../models/Investment.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Seed standard mock perks if database is empty
 */
const seedMockPerks = async () => {
  return; // Disabled seeder
  const count = await Perk.countDocuments();
  if (count > 0) return;

  const mockPerks = [
    {
      title: 'Priority Support',
      description: '24/7 dedicated account manager',
      tier: 'GOLD',
      minInvestment: 2500000,
      status: 'active',
    },
    {
      title: 'Annual Gala Invite',
      description: 'Invitation to exclusive KFPL annual gala event',
      tier: 'GOLD',
      minInvestment: 2500000,
      status: 'active',
    },
    {
      title: 'Quarterly Review',
      description: 'Personal quarterly portfolio review with CIO',
      tier: 'PLATINUM',
      minInvestment: 10000000,
      status: 'active',
    },
    {
      title: 'Film Set Visit',
      description: 'Exclusive behind-the-scenes visit to active film sets',
      tier: 'DIAMOND',
      minInvestment: 30000000,
      status: 'active',
    },
    {
      title: 'Premiere Tickets',
      description: 'VIP premiere tickets for KFPL productions',
      tier: 'SILVER',
      minInvestment: 500000,
      status: 'active',
    },
    {
      title: 'Tax Advisory',
      description: 'Free annual tax planning session',
      tier: 'SILVER',
      minInvestment: 100000,
      status: 'inactive',
    },
  ];

  await Perk.create(mockPerks);
  console.log('[Perk Seeder] Successfully seeded standard perks in Perks Library.');
};

/**
 * Create a new Perk definition (Super Admin only)
 * POST /api/super-admin/perks
 */
const createPerk = asyncHandler(async (req, res, next) => {
  const { title, description, tier, minInvestment, status } = req.body;

  const perk = await Perk.create({
    title,
    description,
    tier,
    minInvestment: minInvestment !== undefined ? Number(minInvestment) : 0,
    status: status || 'active',
  });

  res.status(201).json({
    success: true,
    message: 'Perk definition created successfully',
    data: perk,
  });
});

/**
 * Get all Perks definitions (Super Admin only)
 * GET /api/super-admin/perks
 */
const getAllPerks = asyncHandler(async (req, res, next) => {
  // Auto-seed mock perks if DB is empty
  await seedMockPerks();

  const perks = await Perk.find().sort({ createdAt: -1 }).lean();

  // Calculate card statistics
  const totalPerks = perks.length;
  const activePerks = perks.filter(p => p.status === 'active').length;
  const inactivePerks = totalPerks - activePerks;
  
  // Calculate unique active tiers
  const uniqueTiers = new Set(perks.map(p => p.tier));
  const tiersCount = uniqueTiers.size;

  res.status(200).json({
    success: true,
    data: {
      perks,
      stats: {
        totalPerks,
        activePerks,
        inactivePerks,
        tiersCount,
      },
    },
  });
});

/**
 * Update a Perk definition (Super Admin only)
 * PATCH /api/super-admin/perks/:id
 */
const updatePerk = asyncHandler(async (req, res, next) => {
  const perk = await Perk.findById(req.params.id);
  if (!perk) {
    return next(new AppError('Perk not found', 404));
  }

  const updates = {};
  const allowedFields = ['title', 'description', 'tier', 'minInvestment', 'status'];

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (updates.minInvestment !== undefined) {
    updates.minInvestment = Number(updates.minInvestment);
  }

  const updatedPerk = await Perk.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Perk definition updated successfully',
    data: updatedPerk,
  });
});

/**
 * Delete a Perk definition and its client assignments (Super Admin only)
 * DELETE /api/super-admin/perks/:id
 */
const deletePerk = asyncHandler(async (req, res, next) => {
  const perk = await Perk.findById(req.params.id);
  if (!perk) {
    return next(new AppError('Perk not found', 404));
  }

  // Delete all assignments of this perk to clients
  await ClientPerk.deleteMany({ perkId: req.params.id });

  // Delete the perk definition
  await Perk.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Perk definition and all its client assignments deleted successfully',
  });
});

/**
 * Assign a Perk to multiple Clients (Super Admin only)
 * POST /api/super-admin/perks/assign
 */
const assignPerkToClients = asyncHandler(async (req, res, next) => {
  const { perkId, clientIds } = req.body;

  // 1) Verify perk exists
  const perk = await Perk.findById(perkId);
  if (!perk) {
    return next(new AppError('Perk definition not found', 404));
  }

  let assignedCount = 0;
  
  // 2) Process assignments in parallel, skipping duplicates
  const assignmentPromises = clientIds.map(async (clientId) => {
    // Verify client exists
    const client = await User.findOne({ _id: clientId, role: 'client' });
    if (!client) return;

    // Check if already assigned
    const exists = await ClientPerk.findOne({ clientId, perkId });
    if (exists) return;

    await ClientPerk.create({ clientId, perkId });
    assignedCount++;
  });

  await Promise.all(assignmentPromises);

  res.status(200).json({
    success: true,
    message: `Perk successfully assigned to ${assignedCount} clients.`,
  });
});

/**
 * Get all client assignments (Supports Search and Filtering)
 * GET /api/super-admin/perks/assignments
 */
const getAssignedPerks = asyncHandler(async (req, res, next) => {
  const { search, tier, perkId } = req.query;

  const query = {};

  if (perkId) {
    query.perkId = perkId;
  }

  // 1) If search is specified, find client user IDs that match search
  if (search) {
    const matchingUsers = await User.find({
      role: 'client',
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { clientCode: { $regex: search, $options: 'i' } },
      ],
    }, { _id: 1 });
    
    const userIds = matchingUsers.map(u => u._id);
    query.clientId = { $in: userIds };
  }

  // 2) Fetch assignments populated with client and perk
  let assignments = await ClientPerk.find(query)
    .populate({
      path: 'clientId',
      select: 'name email clientCode',
    })
    .populate({
      path: 'perkId',
      select: 'title tier description minInvestment status',
    })
    .sort({ createdAt: -1 });

  // 3) Filter by tier if specified (filtered in-memory since tier is on the populated Perk)
  if (tier) {
    assignments = assignments.filter(
      assign => assign.perkId && assign.perkId.tier === tier.toUpperCase()
    );
  }

  // 4) Map to a clean, flat client-compatible response
  const results = assignments.map(assign => {
    return {
      _id: assign._id,
      assignedDate: assign.assignedDate,
      client: {
        _id: assign.clientId ? assign.clientId._id : null,
        name: assign.clientId ? assign.clientId.name : '',
        clientCode: assign.clientId ? assign.clientId.clientCode : '',
        email: assign.clientId ? assign.clientId.email : '',
      },
      perk: {
        _id: assign.perkId ? assign.perkId._id : null,
        title: assign.perkId ? assign.perkId.title : '',
        description: assign.perkId ? assign.perkId.description : '',
        tier: assign.perkId ? assign.perkId.tier : '',
        status: assign.perkId ? assign.perkId.status : '',
      },
    };
  });

  res.status(200).json({
    success: true,
    count: results.length,
    data: {
      assignments: results,
    },
  });
});

/**
 * Remove/Unassign a perk from a client (Super Admin only)
 * DELETE /api/super-admin/perks/assignments/:id
 */
const unassignPerk = asyncHandler(async (req, res, next) => {
  const assignment = await ClientPerk.findById(req.params.id);
  if (!assignment) {
    return next(new AppError('Perk assignment record not found', 404));
  }

  await ClientPerk.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Perk successfully unassigned from the client.',
  });
});

/**
 * Get perks assigned to the logged-in client (Client portal)
 * GET /api/client/perks
 */
/**
 * Get perks assigned to the logged-in client (Client portal)
 * GET /api/client/perks
 */
const getMyPerks = asyncHandler(async (req, res, next) => {
  const clientId = req.user.id;

  // 1) Fetch client user and investments
  const user = await User.findById(clientId);
  if (!user) {
    return next(new AppError('Client user not found', 404));
  }

  const investments = await Investment.find({ clientId }).lean();
  const validInvestments = investments.filter(inv => inv.status !== 'cancelled');
  const totalInvestment = validInvestments.reduce((sum, inv) => sum + inv.investmentAmount, 0);

  // 2) Fetch custom assigned perks from database first
  const assignments = await ClientPerk.find({ clientId })
    .populate({
      path: 'perkId',
      select: 'title description tier minInvestment status',
    })
    .sort({ createdAt: -1 });

  const activeAssignedPerks = assignments
    .map(assign => assign.perkId)
    .filter(perk => perk && perk.status === 'active');

  const profile = await ClientProfile.findOne({ userId: clientId });
  const profileTier = profile ? (profile.tier || 'SILVER').toUpperCase() : 'SILVER';

  // 3) Calculate investment-based tier
  // Silver: 0 to 25 Lakh (0 to 2,500,000)
  // Gold: 25 Lakh to 1 Crore (2,500,000 to 10,000,000)
  // Platinum: 1 Crore to 3 Crore (10,000,000 to 30,000,000)
  // Diamond: 3 Crore + (30,000,000+)
  let investmentTier = 'SILVER';
  if (totalInvestment >= 30000000) {
    investmentTier = 'DIAMOND';
  } else if (totalInvestment >= 10000000) {
    investmentTier = 'PLATINUM';
  } else if (totalInvestment >= 2500000) {
    investmentTier = 'GOLD';
  }

  // Determine currentTier as the maximum of: investment tier, database profile tier, and highest assigned perk tier
  const tierWeights = { SILVER: 1, GOLD: 2, PLATINUM: 3, DIAMOND: 4 };
  let currentTier = 'SILVER';
  let maxWeight = tierWeights[investmentTier];

  if (tierWeights[profileTier] > maxWeight) {
    maxWeight = tierWeights[profileTier];
    currentTier = profileTier;
  }

  activeAssignedPerks.forEach(p => {
    const t = (p.tier || 'SILVER').toUpperCase();
    if (tierWeights[t] > maxWeight) {
      maxWeight = tierWeights[t];
      currentTier = t;
    }
  });

  // Calculate next tier boundaries based on current tier
  let tierLevel = 1;
  let nextTier = 'GOLD';
  let targetAmount = 2500000;

  if (currentTier === 'DIAMOND') {
    tierLevel = 4;
    nextTier = null;
    targetAmount = 0;
  } else if (currentTier === 'PLATINUM') {
    tierLevel = 3;
    nextTier = 'DIAMOND';
    targetAmount = 30000000;
  } else if (currentTier === 'GOLD') {
    tierLevel = 2;
    nextTier = 'PLATINUM';
    targetAmount = 10000000;
  }

  const requiredMore = nextTier ? Math.max(0, targetAmount - totalInvestment) : 0;
  let percentage = 0;
  if (nextTier) {
    const prevTarget = currentTier === 'SILVER' ? 0 : (currentTier === 'GOLD' ? 2500000 : 10000000);
    const range = targetAmount - prevTarget;
    const progress = Math.max(0, totalInvestment - prevTarget);
    percentage = Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
  } else {
    percentage = 100;
  }

  // 4) Auto-sync calculated tier to ClientProfile model in DB if higher than stored tier
  if (profile && (!profile.tier || tierWeights[currentTier] > tierWeights[profile.tier.toUpperCase()])) {
    profile.tier = currentTier;
    await profile.save();
  }

  // 5) Gather tier-specific default benefits
  const defaultBenefitsMap = {
    SILVER: [
      { title: 'Monthly investment reports', description: 'Standard monthly performance statement' },
      { title: 'Email support (24hr response)', description: 'Standard email help desk access' },
      { title: 'Basic portfolio insights', description: 'Access to view portfolio growth details' }
    ],
    GOLD: [
      { title: 'All Silver benefits', description: 'Includes all lower tier benefits' },
      { title: 'Priority support (12hr response)', description: 'Faster help desk ticket processing' },
      { title: 'Quarterly investment review call', description: 'One-on-one portfolio review call each quarter' }
    ],
    PLATINUM: [
      { title: 'All Gold benefits', description: 'Includes all lower tier benefits' },
      { title: 'Dedicated relationship manager', description: 'Direct contact point for all operations' },
      { title: 'Exclusive event invitations', description: 'VIP invites to company galas and screenings' }
    ],
    DIAMOND: [
      { title: 'All Platinum benefits', description: 'Includes all lower tier benefits' },
      { title: 'VIP concierge service', description: 'White-glove treatment for deposits/withdrawals' },
      { title: 'Board-level investment insights', description: 'Quarterly reports directly from the executives' }
    ]
  };

  const currentTierBenefits = defaultBenefitsMap[currentTier] || [];

  const assignedPerks = activeAssignedPerks.map(perk => ({
    title: perk.title,
    description: perk.description,
    isCustom: true
  }));

  // Merge default benefits with custom assigned perks
  const allPerks = [...currentTierBenefits, ...assignedPerks];

  // 6) Compile history (dynamic joined event based on join date)
  const history = [
    {
      date: user.createdAt,
      event: `Joined KFPL — Silver tier assigned`
    }
  ];

  // If tier has upgraded beyond Silver, add upgrade event
  if (currentTier !== 'SILVER') {
    history.push({
      date: profile ? profile.updatedAt : new Date(),
      event: `Upgraded to ${currentTier.charAt(0) + currentTier.slice(1).toLowerCase()} tier based on investment`
    });
  }

  // 7) Roadmap configurations
  const roadmap = [
    {
      tier: 'Silver',
      range: '₹0 - ₹25.0L',
      benefitsCount: 3,
      benefits: [
        'Monthly investment reports',
        'Email support (24hr response)',
        'Basic portfolio insights'
      ]
    },
    {
      tier: 'Gold',
      range: '₹25.0L - ₹1.0Cr',
      benefitsCount: 4,
      benefits: [
        'All Silver benefits',
        'Priority support (12hr response)',
        'Quarterly investment review call',
        '+1 more'
      ]
    },
    {
      tier: 'Platinum',
      range: '₹1.0Cr - ₹3.0Cr',
      benefitsCount: 5,
      benefits: [
        'All Gold benefits',
        'Dedicated relationship manager',
        'Exclusive event invitations',
        '+2 more'
      ]
    },
    {
      tier: 'Diamond',
      range: '₹3.0Cr - ∞',
      benefitsCount: 6,
      benefits: [
        'All Platinum benefits',
        'VIP concierge service',
        'Board-level investment insights',
        '+3 more'
      ]
    }
  ];

  res.status(200).json({
    success: true,
    data: {
      currentTier,
      totalInvestment,
      tierLevel,
      upgradeProgress: {
        nextTier,
        targetAmount,
        requiredMore,
        percentage,
      },
      perks: allPerks,
      history,
      roadmap,
    },
  });
});

module.exports = {
  createPerk,
  getAllPerks,
  updatePerk,
  deletePerk,
  assignPerkToClients,
  getAssignedPerks,
  unassignPerk,
  getMyPerks,
};
