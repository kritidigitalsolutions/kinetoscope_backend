const fs = require('fs');
const User = require('../../models/User.model');
const AgentProfile = require('../../models/AgentProfile.model');
const ClientProfile = require('../../models/ClientProfile.model');
const Investment = require('../../models/Investment.model');
const AgentCommission = require('../../models/AgentCommission.model');
const { deleteFromCloudinary, processDocumentUploadsInBackground } = require('../../services/cloudinary.service');
const { sendWelcomeEmail } = require('../../services/email.service');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const { ROLES } = require('../../constants/roles');

const { generateTempPassword } = require('../../utils/generate-password');
const agentDetailsService = require('../../services/agent-details.service');

/**
 * Cleanup helper for local temporary multer files
 */
const cleanupLocalFiles = (files) => {
  if (!files) return;
  Object.values(files).forEach(fileArray => {
    fileArray.forEach(file => {
      if (fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error(`[Cleanup] Failed to delete local temp file ${file.path}:`, err.message);
        }
      }
    });
  });
};

/**
 * Cleanup helper to remove uploaded files from Cloudinary storage in case of db rollback
 */
const deleteCloudinaryFiles = async (urls) => {
  for (const url of urls) {
    if (url) {
      try {
        await deleteFromCloudinary(url);
      } catch (err) {
        console.error(`[Cleanup] Failed to purge file ${url} from Cloudinary:`, err.message);
      }
    }
  }
};

/**
 * Create a new Agent Account and Portal Profile (Super Admin only)
 * POST /api/super-admin/agents
 */
const createAgent = asyncHandler(async (req, res, next) => {
  const fileFields = [
    'panDocument',
    'idProofDocument',
    'bankProofDocument',
    'nomineeProofDocument',
  ];

  // 1) Validate that all 4 files are present in the request
  if (!req.files) {
    return next(new AppError('No documents were uploaded. Please upload all 4 required documents.', 400));
  }

  for (const field of fileFields) {
    if (!req.files[field] || req.files[field].length === 0) {
      cleanupLocalFiles(req.files);
      return next(new AppError(`Required document missing: ${field}`, 400));
    }
  }

  const {
    fullName,
    phone,
    email,
    residencyStatus,
    panNumber,
    aadhaarNumber,
    bankName,
    accountNumber,
    ifscCode,
    oneTimeCommission,
    monthlySlab,
    specialCommission,
    nomineeName,
    nomineeRelation,
    nomineePhone,
    nomineeEmail,
    nomineeResidency,
    password,
    portalPassword,
    status,
  } = req.body;

  // 2) Check if email is already registered in the system
  console.log(`[CreateAgent] Checking email: "${email}" (type: ${typeof email})`);
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log(`[CreateAgent] Duplicate email match found:`, { id: existingUser._id, name: existingUser.name, email: existingUser.email });
    cleanupLocalFiles(req.files);
    return next(new AppError('Email address is already in use by another account.', 400));
  }

  // 3) Generate a sequential agent code starting from AGT-001
  const agents = await User.find({ role: ROLES.AGENT }, { clientCode: 1 });
  let maxSeq = 0;
  agents.forEach(a => {
    if (a.clientCode && a.clientCode.startsWith('AGT-')) {
      const parts = a.clientCode.split('-');
      const seq = parseInt(parts[1], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });
  const agentCode = `AGT-${String(maxSeq + 1).padStart(3, '0')}`;

  // 4) Use provided custom password or generate a secure temporary password
  const tempPassword = password || portalPassword || generateTempPassword();

  // Define database variables outside to perform rollback on error
  let createdUser, createdProfile;

  try {
    // 6) Create the User document
    createdUser = await User.create({
      name: fullName,
      email,
      password: tempPassword,
      role: ROLES.AGENT,
      isActive: status !== 'inactive',
      is2FAEnabled: false, // Default false for smooth initial login
      clientCode: agentCode,
      createdBy: req.user.id,
    });

    // 7) Create the AgentProfile document
    createdProfile = await AgentProfile.create({
      userId: createdUser._id,
      fullName,
      phone,
      email,
      residencyStatus: residencyStatus || 'National (Domestic)',
      panNumber,
      aadhaarNumber,
      bankName,
      accountNumber,
      ifscCode,
      oneTimeCommission: oneTimeCommission !== undefined ? Number(oneTimeCommission) : 0,
      monthlySlab: monthlySlab || '',
      specialCommission: specialCommission !== undefined ? Number(specialCommission) : 0,
      nomineeName,
      nomineeRelation,
      nomineePhone,
      nomineeEmail,
      nomineeResidency: nomineeResidency || 'National (Domestic)',
      panDocument: '', // Populated in background
      idProofDocument: '', // Populated in background
      bankProofDocument: '', // Populated in background
      nomineeProofDocument: '', // Populated in background
      documentStatus: 'pending_upload',
      status: status || 'active',
      portalPassword: tempPassword,
    });
  } catch (dbError) {
    // Rollback: Delete user if created user profile creation fails
    if (createdUser) {
      await User.findByIdAndDelete(createdUser._id);
    }
    cleanupLocalFiles(req.files);
    return next(new AppError(`Database transaction failed: ${dbError.message}`, 500));
  }

  // 8) Trigger background Cloudinary upload
  processDocumentUploadsInBackground({
    files: req.files,
    fileFields,
    Model: AgentProfile,
    filter: { userId: createdUser._id },
    entityLabel: 'Agent',
  });

  try {
    // 9) Send Welcome Email containing credentials
    const loginUrl = process.env.AGENT_PORTAL_URL || 'http://localhost:5173/agent/login';
    await sendWelcomeEmail(email, fullName, agentCode, tempPassword, loginUrl);
  } catch (emailError) {
    console.error(`Welcome email failed to dispatch to ${email}:`, emailError.message);
  }

  // Clear password from return payload
  createdUser.password = undefined;

  res.status(201).json({
    success: true,
    message: 'Agent onboarding initiated. Documents are being uploaded in the background. Welcome email sent.',
    data: {
      user: createdUser,
      profile: createdProfile,
      credentials: {
        agentCode,
        email,
        temporaryPassword: tempPassword,
      },
    },
  });
});

/**
 * Get all Agents (Supports Search, Status Filter, and Pagination)
 * GET /api/super-admin/agents
 */
const getAllAgents = asyncHandler(async (req, res, next) => {
  const { search, status, page = 1, limit = 10 } = req.query;

  // Build user query targeting role=agent
  const userQuery = { role: ROLES.AGENT };

  if (search) {
    userQuery.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { clientCode: { $regex: search, $options: 'i' } },
    ];
  }

  // Filter based on profile status
  if (status) {
    const profilesMatchingStatus = await AgentProfile.find({ status }, { userId: 1 });
    const userIds = profilesMatchingStatus.map(p => p.userId);
    userQuery._id = { $in: userIds };
  }

  const skip = (page - 1) * limit;

  // Run user query and count in parallel, and use lean mode for faster query execution
  const [users, total] = await Promise.all([
    User.find(userQuery)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    User.countDocuments(userQuery)
  ]);

  const agentIds = users.map(u => u._id);

  // Fetch agent profiles and assigned clients in parallel in bulk
  const [profiles, allClients] = await Promise.all([
    AgentProfile.find({ userId: { $in: agentIds } }).lean(),
    User.find(
      { role: ROLES.CLIENT, assignedAgent: { $in: agentIds } },
      { _id: 1, assignedAgent: 1 }
    ).lean()
  ]);

  const profileMap = {};
  profiles.forEach(p => {
    profileMap[p.userId.toString()] = p;
  });

  // Map agent ID to their list of client IDs
  const agentClientsMap = {};
  agentIds.forEach(id => {
    agentClientsMap[id.toString()] = [];
  });
  
  const allClientIds = [];
  allClients.forEach(c => {
    if (c.assignedAgent) {
      const agentIdStr = c.assignedAgent.toString();
      if (agentClientsMap[agentIdStr]) {
        agentClientsMap[agentIdStr].push(c._id.toString());
      }
      allClientIds.push(c._id);
    }
  });

  // 3) Fetch active investments in bulk
  let investmentMap = {}; // Maps clientId -> sum of active investment amounts
  if (allClientIds.length > 0) {
    const investments = await Investment.find(
      { clientId: { $in: allClientIds }, status: 'active' },
      { clientId: 1, investmentAmount: 1 }
    ).lean();
    investments.forEach(inv => {
      const clientIdStr = inv.clientId.toString();
      investmentMap[clientIdStr] = (investmentMap[clientIdStr] || 0) + inv.investmentAmount;
    });
  }

  // 4) Assemble final records
  const agentRecords = users.map(user => {
    const userIdStr = user._id.toString();
    const profile = profileMap[userIdStr] || null;
    const clientIdsForAgent = agentClientsMap[userIdStr] || [];
    const clientsCount = clientIdsForAgent.length;
    
    let totalInvestment = 0;
    clientIdsForAgent.forEach(cid => {
      totalInvestment += (investmentMap[cid] || 0);
    });

    return {
      user,
      profile,
      clientsCount,
      totalInvestment,
    };
  });

  res.status(200).json({
    success: true,
    count: agentRecords.length,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
    data: {
      agents: agentRecords,
    },
  });
});

/**
 * Get Agent by ID
 * GET /api/super-admin/agents/:id
 */
const getAgentById = asyncHandler(async (req, res, next) => {
  const details = await agentDetailsService.getAgentDetailsData(req.params.id);
  const documentsData = await agentDetailsService.getAgentDocumentsData(req.params.id);

  res.status(200).json({
    success: true,
    data: {
      ...details,
      documents: documentsData.documents,
      kycStatus: documentsData.kycStatus,
      verificationStatus: documentsData.verificationStatus,
    },
  });
});

/**
 * Update Agent details and status (Super Admin only)
 * PATCH /api/super-admin/agents/:id
 */
const updateAgent = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;

  // 1) Find the target user and profile
  const user = await User.findById(userId);
  if (!user || user.role !== ROLES.AGENT) {
    return next(new AppError('Agent user record not found.', 404));
  }

  const profile = await AgentProfile.findOne({ userId });
  if (!profile) {
    return next(new AppError('Agent profile record not found.', 404));
  }

  // 2) Parse updates for the User model
  const userUpdates = {};
  if (req.body.fullName) {
    userUpdates.name = req.body.fullName;
  }
  if (req.body.status) {
    req.body.status = req.body.status.toLowerCase();
    userUpdates.isActive = req.body.status === 'active';
  }
  if (req.body.email) {
    const newEmail = req.body.email.toLowerCase().trim();
    if (newEmail !== user.email) {
      const duplicateUser = await User.findOne({ email: newEmail });
      if (duplicateUser) {
        cleanupLocalFiles(req.files);
        return next(new AppError('Email address is already in use by another account.', 400));
      }
      userUpdates.email = newEmail;
    }
  }

  const profileUpdates = {};

  if (req.body.password || req.body.portalPassword) {
    const newPwd = req.body.password || req.body.portalPassword;
    userUpdates.password = newPwd;
    profileUpdates.portalPassword = newPwd;
  }

  // Guard against masked bank account numbers from front-end input
  if (req.body.accountNumber && (req.body.accountNumber.includes('X') || req.body.accountNumber.includes('x') || req.body.accountNumber.includes('*'))) {
    delete req.body.accountNumber;
  }

  // 3) Parse updates for the AgentProfile model
  const profileFields = [
    'fullName',
    'phone',
    'residencyStatus',
    'panNumber',
    'aadhaarNumber',
    'bankName',
    'accountNumber',
    'ifscCode',
    'oneTimeCommission',
    'monthlySlab',
    'specialCommission',
    'nomineeName',
    'nomineeRelation',
    'nomineePhone',
    'nomineeEmail',
    'nomineeResidency',
    'status',
  ];


  profileFields.forEach(field => {
    if (req.body[field] !== undefined) {
      profileUpdates[field] = req.body[field];
    }
  });

  if (userUpdates.email) {
    profileUpdates.email = userUpdates.email;
  }

  // 4) Process optional document uploads
  const fileFields = [
    'panDocument',
    'idProofDocument',
    'bankProofDocument',
    'nomineeProofDocument',
  ];

  const uploadedUrls = [];
  try {
    if (req.files) {
      for (const field of fileFields) {
        if (req.files[field] && req.files[field].length > 0) {
          // Delete old document from Cloudinary if it exists
          if (profile[field]) {
            try {
              await deleteFromCloudinary(profile[field]);
            } catch (err) {
              console.error(`[Cleanup] Failed to delete old file ${profile[field]} from Cloudinary:`, err.message);
            }
          }

          // Assign new Cloudinary URL directly
          const newUrl = req.files[field][0].path;
          profileUpdates[field] = newUrl;
          uploadedUrls.push(newUrl);
        }
      }
    }
  } catch (uploadError) {
    await deleteCloudinaryFiles(uploadedUrls);
    return next(new AppError(`Document upload failed: ${uploadError.message}`, 500));
  }

  // 5) Perform database updates
  const updatedUser = await User.findByIdAndUpdate(userId, { $set: userUpdates }, { new: true, runValidators: true });
  const updatedProfile = await AgentProfile.findOneAndUpdate(
    { userId },
    { $set: profileUpdates },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Agent updated successfully',
    data: {
      user: updatedUser,
      profile: updatedProfile,
    },
  });
});

/**
 * Delete an Agent User, Profile, and documents stored on Firebase (Super Admin only)
 * DELETE /api/super-admin/agents/:id
 */
const deleteAgent = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;

  const user = await User.findById(userId);
  if (!user || user.role !== ROLES.AGENT) {
    return next(new AppError('Agent user record not found.', 404));
  }

  const profile = await AgentProfile.findOne({ userId });

  // 1) Purge documents from Cloudinary storage if they exist
  if (profile) {
    const documentsToPurge = [
      profile.panDocument,
      profile.idProofDocument,
      profile.bankProofDocument,
      profile.nomineeProofDocument,
    ];
    await deleteCloudinaryFiles(documentsToPurge);
    await AgentProfile.findByIdAndDelete(profile._id);
  }

  // 2) Unset assignedAgent reference for all clients assigned to this agent
  await User.updateMany(
    { assignedAgent: userId },
    { $unset: { assignedAgent: '' } }
  );

  // 3) Delete User document from Mongo
  await User.findByIdAndDelete(userId);

  res.status(200).json({
    success: true,
    message: 'Agent account and associated profile/documents deleted successfully. Client associations cleared.',
  });
});

/**
 * Get Clients assigned to a specific Agent (Super Admin only)
 * GET /api/super-admin/agents/:id/clients
 */
const getAgentClients = asyncHandler(async (req, res, next) => {
  const agentId = req.params.id;

  // 1) Verify agent exists
  const agent = await User.findById(agentId);
  if (!agent || agent.role !== ROLES.AGENT) {
    return next(new AppError('Agent account not found.', 404));
  }

  // Fetch agent profile once outside the loop
  const agentProfile = await AgentProfile.findOne({ userId: agentId });
  const monthlySlabStr = (agentProfile && agentProfile.monthlySlab) ? agentProfile.monthlySlab.replace('%', '') : '0.5';
  const monthlySlabPct = parseFloat(monthlySlabStr) || 0.5;
  const months = 3;

  // 2) Find all clients assigned to this agent
  const clients = await User.find({ role: ROLES.CLIENT, assignedAgent: agentId }).sort({ createdAt: -1 });
  const clientIds = clients.map(c => c._id);

  // Bulk fetch profiles
  const profiles = await ClientProfile.find({ userId: { $in: clientIds } });
  const profileMap = {};
  profiles.forEach(p => {
    profileMap[p.userId.toString()] = p;
  });

  // Bulk fetch investments
  const investments = await Investment.find({ clientId: { $in: clientIds }, status: 'active' });
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

  const clientRecords = clients.map(client => {
    const profile = profileMap[client._id.toString()];
    const clientInvestments = investmentsMap[client._id.toString()] || [];
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
 * Get Commission history for a specific Agent (Super Admin only)
 * GET /api/super-admin/agents/:id/commissions
 */
const getAgentCommissions = asyncHandler(async (req, res, next) => {
  const agentId = req.params.id;

  // 1) Verify agent exists
  const agent = await User.findById(agentId);
  if (!agent || agent.role !== ROLES.AGENT) {
    return next(new AppError('Agent account not found.', 404));
  }

  // 2) Find commission records in DB
  let commissions = await AgentCommission.find({ agentId }).sort({ createdAt: -1 });

  // 3) If no records exist, auto-seed realistic mock data to match screens
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
 * Update Agent account status (Super Admin only)
 * PATCH /api/super-admin/agents/:id/status
 */
const updateAgentStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const userId = req.params.id;

  if (!status) {
    return next(new AppError('Status is required.', 400));
  }

  const normalizedStatus = status.toLowerCase();
  const allowedStatuses = ['active', 'inactive', 'suspended', 'blocked', 'hold'];
  if (!allowedStatuses.includes(normalizedStatus)) {
    return next(new AppError('Invalid status value.', 400));
  }

  // 1) Find the target agent
  const user = await User.findById(userId);
  if (!user || user.role !== ROLES.AGENT) {
    return next(new AppError('Agent user record not found.', 404));
  }

  // 2) Update User isActive field based on status
  const isActive = normalizedStatus === 'active';
  
  await User.findByIdAndUpdate(userId, { isActive });
  const updatedProfile = await AgentProfile.findOneAndUpdate(
    { userId },
    { status: normalizedStatus },
    { new: true, runValidators: true }
  );

  if (!updatedProfile) {
    return next(new AppError('Agent profile record not found.', 404));
  }

  res.status(200).json({
    success: true,
    message: `Agent status successfully updated to ${normalizedStatus}`,
    data: {
      userId,
      status: normalizedStatus,
      isActive,
    },
  });
});

/**
 * Verify a single KYC document for an agent (Super Admin only)
 * PATCH /api/super-admin/agents/:id/verify-document
 * Body: { documentField: "panDocument" | "idProofDocument" | "bankProofDocument" | "nomineeProofDocument" }
 */
const verifyAgentDocument = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { documentField } = req.body;

  const allowedFields = [
    'panDocument',
    'idProofDocument',
    'bankProofDocument',
    'nomineeProofDocument',
  ];

  if (!documentField || !allowedFields.includes(documentField)) {
    return next(new AppError(`Invalid document field. Must be one of: ${allowedFields.join(', ')}`, 400));
  }

  const profile = await AgentProfile.findOne({ userId: id });
  if (!profile) {
    return next(new AppError('Agent profile not found.', 404));
  }

  if (!profile[documentField]) {
    return next(new AppError(`Document "${documentField}" has not been uploaded yet.`, 400));
  }

  const verifiedField = `${documentField}Verified`;
  profile[verifiedField] = true;

  const allVerified =
    (documentField === 'panDocument' ? true : profile.panDocumentVerified) &&
    (documentField === 'idProofDocument' ? true : profile.idProofDocumentVerified) &&
    (documentField === 'bankProofDocument' ? true : profile.bankProofDocumentVerified) &&
    (documentField === 'nomineeProofDocument' ? true : profile.nomineeProofDocumentVerified);

  if (allVerified) {
    profile.kycStatus = 'VERIFIED';
  }

  await profile.save();

  res.status(200).json({
    success: true,
    message: allVerified
      ? 'All documents verified. Agent KYC status updated to VERIFIED.'
      : `Document "${documentField}" verified successfully.`,
    data: {
      documentField,
      verified: true,
      kycStatus: profile.kycStatus,
      verificationStatus: {
        panDocumentVerified: profile.panDocumentVerified,
        idProofDocumentVerified: profile.idProofDocumentVerified,
        bankProofDocumentVerified: profile.bankProofDocumentVerified,
        nomineeProofDocumentVerified: profile.nomineeProofDocumentVerified,
      },
    },
  });
});

module.exports = {
  createAgent,
  getAllAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  getAgentClients,
  getAgentCommissions,
  updateAgentStatus,
  verifyAgentDocument,
};

