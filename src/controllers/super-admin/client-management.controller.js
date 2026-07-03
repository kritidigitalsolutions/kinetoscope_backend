const fs = require('fs');
const mongoose = require('mongoose');
const User = require('../../models/User.model');
const ClientProfile = require('../../models/ClientProfile.model');
const { deleteFromCloudinary, processDocumentUploadsInBackground, uploadDocumentsToCloudinaryParallelBackground } = require('../../services/cloudinary.service');
const { sendWelcomeEmail } = require('../../services/email.service');
const { calculateDashboardData } = require('../client/client-dashboard.controller');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const { ROLES } = require('../../constants/roles');

const { generateTempPassword } = require('../../utils/generate-password');
const clientDetailsService = require('../../services/client-details.service');

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
 * Create a new Client Account and Portal Profile (Super Admin only)
 * POST /api/super-admin/clients
 */
const createClient = asyncHandler(async (req, res, next) => {
  const fileFields = [
    'panDocument',
    'aadhaarDocument',
    'bankProofDocument',
    'agreementDocument',
    'nomineeProofDocument',
  ];

  // 1) Validate that all 5 files are present in the request
  if (!req.files) {
    return next(new AppError('No documents were uploaded. Please upload all 5 required documents.', 400));
  }

  for (const field of fileFields) {
    if (!req.files[field] || req.files[field].length === 0) {
      return next(new AppError(`Required document missing: ${field}`, 400));
    }
  }

  const {
    fullName,
    phone,
    email,
    dob,
    address,
    riskProfile,
    residencyStatus,
    monthlyRoi,
    panNumber,
    aadhaarNumber,
    bankName,
    accountNumber,
    ifscCode,
    nomineeName,
    nomineeRelation,
    nomineePhone,
    nomineeEmail,
    nomineeResidency,
    assignedAgent,
    tier,
    contractStartDate,
    contractEndDate,
    agentCommission,
    kycStatus,
    password,
    portalPassword,
  } = req.body;

  const finalTier = tier || 'SILVER';
  let finalContractStartDate = contractStartDate ? new Date(contractStartDate) : new Date();
  let finalContractEndDate = contractEndDate ? new Date(contractEndDate) : null;
  if (!finalContractEndDate) {
    const d = new Date(finalContractStartDate);
    d.setFullYear(d.getFullYear() + 2);
    finalContractEndDate = d;
  }
  let finalAgentCommission = agentCommission;
  if (!finalAgentCommission) {
    if (finalTier === 'DIAMOND') finalAgentCommission = '0.75% monthly';
    else if (finalTier === 'PLATINUM') finalAgentCommission = '1% monthly';
    else if (finalTier === 'GOLD') finalAgentCommission = '0.5% monthly';
    else finalAgentCommission = '0.5% monthly';
  }

  // 2) Check if email is already registered in the system
  console.log(`[CreateClient] Checking email: "${email}" (type: ${typeof email})`);
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log(`[CreateClient] Duplicate email match found:`, { id: existingUser._id, name: existingUser.name, email: existingUser.email });
    return next(new AppError('Email address is already in use by another account.', 400));
  }

  // 3) Generate a sequential client code starting from KFPL-1001
  const clients = await User.find({ clientCode: /^KFPL-\d+$/ }, { clientCode: 1 });
  let maxSeq = 1000;
  clients.forEach(c => {
    if (c.clientCode) {
      const parts = c.clientCode.split('-');
      const seq = parseInt(parts[1], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });
  const clientCode = `KFPL-${maxSeq + 1}`;

  // 4) Use provided custom password or generate a secure temporary password
  const tempPassword = password || portalPassword || generateTempPassword();

  // Define database variables outside to perform rollback on error
  let createdUser, createdProfile;

  try {
    // 6) Create the User document
    console.log('[CreateClient] Step 6: Creating User document...');
    createdUser = await User.create({
      name: fullName,
      email,
      password: tempPassword,
      role: ROLES.CLIENT,
      isActive: true,
      is2FAEnabled: false, // Default false for smooth temp password login
      clientCode,
      assignedAgent: (assignedAgent && mongoose.Types.ObjectId.isValid(assignedAgent)) ? assignedAgent : undefined,
      createdBy: req.user.id,
    });
    console.log('[CreateClient] Step 6: User created successfully:', createdUser._id);

    // 7) Create the ClientProfile document
    console.log('[CreateClient] Step 7: Creating ClientProfile document...');
    createdProfile = await ClientProfile.create({
      userId: createdUser._id,
      fullName,
      phone,
      email,
      dob,
      address,
      riskProfile,
      residencyStatus: residencyStatus || 'National (Domestic)',
      monthlyRoi: monthlyRoi !== undefined ? Number(monthlyRoi) : 1.2,
      panNumber,
      aadhaarNumber,
      bankName,
      accountNumber,
      ifscCode,
      nomineeName,
      nomineeRelation,
      nomineePhone,
      nomineeEmail,
      nomineeResidency: nomineeResidency || 'National (Domestic)',
      panDocument: '',
      aadhaarDocument: '',
      bankProofDocument: '',
      agreementDocument: '',
      nomineeProofDocument: '',
      documentStatus: 'pending_upload',
      status: 'active',
      kycStatus: kycStatus || 'PENDING',
      tier: finalTier,
      contractStartDate: finalContractStartDate,
      contractEndDate: finalContractEndDate,
      agentCommission: finalAgentCommission,
      portalPassword: tempPassword,
    });
    console.log('[CreateClient] Step 7: ClientProfile created successfully:', createdProfile._id);
  } catch (dbError) {
    console.error('[CreateClient] DATABASE ERROR:', dbError.message, dbError.stack);
    // Rollback: Delete user if created user profile creation fails
    if (createdUser) {
      await User.findByIdAndDelete(createdUser._id);
    }
    return next(new AppError(`Database transaction failed: ${dbError.message}`, 500));
  }

  // 8) Trigger parallel in-memory background uploads (Vercel-safe using waitUntil)
  uploadDocumentsToCloudinaryParallelBackground({
    files: req.files,
    fileFields,
    Model: ClientProfile,
    filter: { userId: createdUser._id },
    entityLabel: 'Client',
  });

  try {
    // 9) Send Welcome Email containing credentials
    const loginUrl = process.env.CLIENT_PORTAL_URL || 'http://localhost:5173/client/login';
    await sendWelcomeEmail(email, fullName, clientCode, tempPassword, loginUrl);
  } catch (emailError) {
    console.error(`Welcome email failed to dispatch to ${email}:`, emailError.message);
  }

  // Clear password from return payload
  createdUser.password = undefined;

  res.status(201).json({
    success: true,
    message: 'Client onboarding initiated. Documents are uploading in the background.',
    data: {
      user: createdUser,
      profile: createdProfile,
      credentials: {
        clientCode,
        email,
        temporaryPassword: tempPassword,
      },
    },
  });
});

/**
 * Get all Clients (Supports Search, Status Filter, and Pagination)
 * GET /api/super-admin/clients
 */
const getAllClients = asyncHandler(async (req, res, next) => {
  const { search, status, page = 1, limit = 10 } = req.query;

  // Build user query targeting role=client
  const userQuery = { role: ROLES.CLIENT };

  if (search) {
    userQuery.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { clientCode: { $regex: search, $options: 'i' } },
    ];
  }

  // Filter based on profile status
  if (status) {
    const profilesMatchingStatus = await ClientProfile.find({ status }, { userId: 1 });
    const userIds = profilesMatchingStatus.map(p => p.userId);
    userQuery._id = { $in: userIds };
  }

  const skip = (page - 1) * limit;

  // Run user query and count in parallel, and use lean mode for faster query execution
  const [users, total] = await Promise.all([
    User.find(userQuery)
      .populate('assignedAgent', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    User.countDocuments(userQuery)
  ]);

  const userIds = users.map(u => u._id);
  const profiles = await ClientProfile.find({ userId: { $in: userIds } }).lean();
  
  const profileMap = {};
  profiles.forEach(p => {
    profileMap[p.userId.toString()] = p;
  });

  const clientRecords = users.map(user => ({
    user,
    profile: profileMap[user._id.toString()] || null
  }));

  res.status(200).json({
    success: true,
    count: clientRecords.length,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
    data: {
      clients: clientRecords,
    },
  });
});

const getClientById = asyncHandler(async (req, res, next) => {
  const details = await clientDetailsService.getClientDetailsData(req.params.id);

  res.status(200).json({
    success: true,
    data: details,
  });
});

/**
 * Update Client details and status (Super Admin only)
 * PATCH /api/super-admin/clients/:id
 */
const updateClient = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;

  // 1) Find the target user and profile
  const user = await User.findById(userId);
  if (!user || user.role !== ROLES.CLIENT) {
    return next(new AppError('Client user record not found.', 404));
  }

  const profile = await ClientProfile.findOne({ userId });
  if (!profile) {
    return next(new AppError('Client profile record not found.', 404));
  }

  // 2) Parse updates for the User model
  const userUpdates = {};
  if (req.body.fullName) {
    userUpdates.name = req.body.fullName;
  }
  if (req.body.assignedAgent !== undefined) {
    userUpdates.assignedAgent = (req.body.assignedAgent && mongoose.Types.ObjectId.isValid(req.body.assignedAgent)) ? req.body.assignedAgent : null;
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

  // 3) Parse updates for the ClientProfile model
  const profileFields = [
    'fullName',
    'phone',
    'dob',
    'address',
    'riskProfile',
    'residencyStatus',
    'monthlyRoi',
    'bankName',
    'accountNumber',
    'ifscCode',
    'nomineeName',
    'nomineeRelation',
    'nomineePhone',
    'nomineeEmail',
    'nomineeResidency',
    'status',
    'tier',
    'contractStartDate',
    'contractEndDate',
    'extendContractDate',
    'agentCommission',
    'kycStatus',
    'panNumber',
    'aadhaarNumber',
    'portalPassword',
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
    'aadhaarDocument',
    'bankProofDocument',
    'agreementDocument',
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
  const updatedProfile = await ClientProfile.findOneAndUpdate(
    { userId },
    { $set: profileUpdates },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Client updated successfully',
    data: {
      user: updatedUser,
      profile: updatedProfile,
    },
  });
});

/**
 * Delete a Client User, Profile, and documents stored on Firebase (Super Admin only)
 * DELETE /api/super-admin/clients/:id
 */
const deleteClient = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;

  const user = await User.findById(userId);
  if (!user || user.role !== ROLES.CLIENT) {
    return next(new AppError('Client user record not found.', 404));
  }

  const profile = await ClientProfile.findOne({ userId });

  // 1) Purge documents from Cloudinary storage if they exist
  if (profile) {
    const documentsToPurge = [
      profile.panDocument,
      profile.aadhaarDocument,
      profile.bankProofDocument,
      profile.agreementDocument,
      profile.nomineeProofDocument,
    ];
    await deleteCloudinaryFiles(documentsToPurge);
    await ClientProfile.findByIdAndDelete(profile._id);
  }

  // 2) Delete User document from Mongo
  await User.findByIdAndDelete(userId);

  res.status(200).json({
    success: true,
    message: 'Client account and associated profile/documents deleted successfully.',
  });
});

/**
 * Preview client dashboard metrics (Super Admin only)
 * GET /api/super-admin/client-dashboard/:clientId
 */
const previewClientDashboard = asyncHandler(async (req, res, next) => {
  const dashboardData = await calculateDashboardData(req.params.clientId);

  res.status(200).json({
    success: true,
    data: dashboardData,
  });
});

/**
 * Get all active Agents (Super Admin only)
 * GET /api/super-admin/agents
 */
const getAllAgents = asyncHandler(async (req, res, next) => {
  const agents = await User.find({ role: ROLES.AGENT, isActive: true }).select('name email clientCode');

  res.status(200).json({
    success: true,
    count: agents.length,
    data: {
      agents,
    },
  });
});

/**
 * Update client's Monthly ROI rate (Super Admin only)
 * PATCH /api/super-admin/clients/:id/roi-rate
 */
const updateClientRoiRate = asyncHandler(async (req, res, next) => {
  const { monthlyRoi } = req.body;
  const userId = req.params.id;

  if (monthlyRoi === undefined) {
    return next(new AppError('Monthly ROI rate is required.', 400));
  }

  const roiNum = Number(monthlyRoi);
  if (isNaN(roiNum) || roiNum < 0) {
    return next(new AppError('Monthly ROI rate must be a non-negative number.', 400));
  }

  const updatedProfile = await ClientProfile.findOneAndUpdate(
    { userId },
    { $set: { monthlyRoi: roiNum } },
    { new: true, runValidators: true }
  );

  if (!updatedProfile) {
    return next(new AppError('Client profile not found.', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Monthly ROI rate updated successfully.',
    data: {
      userId,
      monthlyRoi: roiNum,
    },
  });
});

/**
 * Verify a single KYC document for a client (Super Admin only)
 * PATCH /api/super-admin/clients/:id/verify-document
 * Body: { documentField: "panDocument" | "aadhaarDocument" | "bankProofDocument" | "agreementDocument" | "nomineeProofDocument" }
 */
const verifyDocument = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { documentField } = req.body;

  // Allowed document fields that can be verified
  const allowedFields = [
    'panDocument',
    'aadhaarDocument',
    'bankProofDocument',
    'agreementDocument',
    'nomineeProofDocument',
  ];

  if (!documentField || !allowedFields.includes(documentField)) {
    return next(new AppError(`Invalid document field. Must be one of: ${allowedFields.join(', ')}`, 400));
  }

  const profile = await ClientProfile.findOne({ userId: id });
  if (!profile) {
    return next(new AppError('Client profile not found.', 404));
  }

  // Check that the document actually exists (has a URL)
  if (!profile[documentField]) {
    return next(new AppError(`Document "${documentField}" has not been uploaded yet.`, 400));
  }

  // Mark the specific document as verified
  const verifiedField = `${documentField}Verified`;
  profile[verifiedField] = true;

  // Check if ALL documents are now verified
  const allVerified =
    (documentField === 'panDocument' ? true : profile.panDocumentVerified) &&
    (documentField === 'aadhaarDocument' ? true : profile.aadhaarDocumentVerified) &&
    (documentField === 'bankProofDocument' ? true : profile.bankProofDocumentVerified) &&
    (documentField === 'agreementDocument' ? true : profile.agreementDocumentVerified) &&
    (documentField === 'nomineeProofDocument' ? true : profile.nomineeProofDocumentVerified);

  // Auto-update KYC status to VERIFIED when all documents are verified
  if (allVerified) {
    profile.kycStatus = 'VERIFIED';
  }

  await profile.save();

  res.status(200).json({
    success: true,
    message: allVerified
      ? 'All documents verified. KYC status updated to VERIFIED.'
      : `Document "${documentField}" verified successfully.`,
    data: {
      documentField,
      verified: true,
      kycStatus: profile.kycStatus,
      verificationStatus: {
        panDocumentVerified: profile.panDocumentVerified,
        aadhaarDocumentVerified: profile.aadhaarDocumentVerified,
        bankProofDocumentVerified: profile.bankProofDocumentVerified,
        agreementDocumentVerified: profile.agreementDocumentVerified,
        nomineeProofDocumentVerified: profile.nomineeProofDocumentVerified,
      },
    },
  });
});

module.exports = {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  deleteClient,
  previewClientDashboard,
  getAllAgents,
  updateClientRoiRate,
  verifyDocument,
};
