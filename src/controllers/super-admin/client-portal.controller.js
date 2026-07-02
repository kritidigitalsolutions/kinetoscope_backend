const User = require('../../models/User.model');
const ClientProfile = require('../../models/ClientProfile.model');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const { ROLES } = require('../../constants/roles');

/**
 * List all client accounts with pagination, search, and status filter.
 * GET /api/super-admin/client-portal
 *
 * Query params:
 *   search - Filter by name, email, or clientCode (case-insensitive regex)
 *   status - Filter by ClientProfile status (active | inactive | suspended)
 *   page   - Page number (default: 1)
 *   limit  - Results per page (default: 10)
 */
const listClientAccounts = asyncHandler(async (req, res, next) => {
  const { search, status, residencyStatus, tier, page = 1, limit = 10 } = req.query;

  // Build query targeting role=client
  const userQuery = { role: ROLES.CLIENT };

  // Search by name, email, or clientCode
  if (search) {
    userQuery.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { clientCode: { $regex: search, $options: 'i' } },
    ];
  }

  // Filter by ClientProfile fields (status, residencyStatus, tier) if provided
  const profileFilter = {};
  if (status && status !== 'All Statuses') {
    profileFilter.status = status.toLowerCase();
  }
  if (residencyStatus && residencyStatus !== 'All Residency') {
    profileFilter.residencyStatus = residencyStatus;
  }
  if (tier && tier !== 'All Tiers') {
    profileFilter.tier = tier.toUpperCase();
  }

  if (Object.keys(profileFilter).length > 0) {
    const matchingProfiles = await ClientProfile.find(profileFilter, { userId: 1 });
    const userIds = matchingProfiles.map(p => p.userId);
    userQuery._id = { $in: userIds };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const users = await User.find(userQuery)
    .select('clientCode name email isActive lastLogin createdAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await User.countDocuments(userQuery);

  const userIds = users.map(u => u._id);
  const profiles = await ClientProfile.find({ userId: { $in: userIds } })
    .select('userId status portalPassword residencyStatus tier');

  const profileMap = {};
  profiles.forEach(p => {
    profileMap[p.userId.toString()] = p;
  });

  const clients = users.map(user => {
    const profile = profileMap[user._id.toString()];
    return {
      _id: user._id,
      clientCode: user.clientCode,
      name: user.name,
      email: user.email,
      portalPassword: profile ? (profile.portalPassword || '') : '',
      status: profile ? (profile.status || '').toUpperCase() : null,
      residencyStatus: profile ? (profile.residencyStatus || 'National (Domestic)') : 'National (Domestic)',
      tier: profile ? (profile.tier || 'SILVER') : 'SILVER',
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    };
  });

  res.status(200).json({
    success: true,
    count: clients.length,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
    data: {
      clients,
    },
  });
});

/**
 * Get complete client account details (User + ClientProfile)
 * GET /api/super-admin/client-portal/:clientId
 */
const getClientAccountDetails = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.clientId)
    .populate('assignedAgent', 'name email')
    .populate('createdBy', 'name email');

  if (!user || user.role !== ROLES.CLIENT) {
    return next(new AppError('Client account not found.', 404));
  }

  const profile = await ClientProfile.findOne({ userId: user._id });

  res.status(200).json({
    success: true,
    data: {
      user,
      profile,
    },
  });
});


/**
 * Update client account status (active | inactive | suspended).
 * PATCH /api/super-admin/client-portal/:clientId/status
 *
 * Updates both User.isActive and ClientProfile.status atomically.
 */
const updateClientStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const normalizedStatus = status.toLowerCase();

  const user = await User.findById(req.params.clientId);

  if (!user || user.role !== ROLES.CLIENT) {
    return next(new AppError('Client account not found.', 404));
  }

  // 1) Update User.isActive based on status
  user.isActive = normalizedStatus === 'active';
  await user.save({ validateBeforeSave: false });

  // 2) Update ClientProfile.status
  const profile = await ClientProfile.findOneAndUpdate(
    { userId: user._id },
    { $set: { status: normalizedStatus } },
    { new: true, runValidators: true }
  );

  if (!profile) {
    return next(new AppError('Client profile not found for this account.', 404));
  }

  res.status(200).json({
    success: true,
    message: `Client account status updated to '${status}' successfully.`,
    data: {
      clientId: user._id,
      isActive: user.isActive,
      status: profile.status,
    },
  });
});

module.exports = {
  listClientAccounts,
  getClientAccountDetails,
  updateClientStatus,
};
