const fs = require('fs');
const mongoose = require('mongoose');
const User = require('../../models/User.model');
const ClientProfile = require('../../models/ClientProfile.model');
const { uploadToFirebase, deleteFromFirebase } = require('../../services/firebase.service');
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
 * Cleanup helper to remove uploaded files from Firebase storage in case of db rollback
 */
const deleteFirebaseFiles = async (urls) => {
  for (const url of urls) {
    if (url) {
      try {
        await deleteFromFirebase(url);
      } catch (err) {
        console.error(`[Cleanup] Failed to purge file ${url} from Firebase Storage:`, err.message);
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
      cleanupLocalFiles(req.files);
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
    contractEndDate,
    agentCommission,
    kycStatus,
    password,
    portalPassword,
  } = req.body;

  const finalTier = tier || 'SILVER';
  let finalContractEndDate = contractEndDate;
  if (!finalContractEndDate) {
    const d = new Date();
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
    cleanupLocalFiles(req.files);
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

  const uploadedUrls = [];
  let panDocument, aadhaarDocument, bankProofDocument, agreementDocument, nomineeProofDocument;

  try {
    // 5) Upload files sequentially to Firebase Storage
    const panPath = `clients/${clientCode}/panDocument_${Date.now()}`;
    panDocument = await uploadToFirebase(req.files.panDocument[0].path, panPath);
    uploadedUrls.push(panDocument);

    const aadhaarPath = `clients/${clientCode}/aadhaarDocument_${Date.now()}`;
    aadhaarDocument = await uploadToFirebase(req.files.aadhaarDocument[0].path, aadhaarPath);
    uploadedUrls.push(aadhaarDocument);

    const bankProofPath = `clients/${clientCode}/bankProofDocument_${Date.now()}`;
    bankProofDocument = await uploadToFirebase(req.files.bankProofDocument[0].path, bankProofPath);
    uploadedUrls.push(bankProofDocument);

    const agreementPath = `clients/${clientCode}/agreementDocument_${Date.now()}`;
    agreementDocument = await uploadToFirebase(req.files.agreementDocument[0].path, agreementPath);
    uploadedUrls.push(agreementDocument);

    const nomineeProofPath = `clients/${clientCode}/nomineeProofDocument_${Date.now()}`;
    nomineeProofDocument = await uploadToFirebase(req.files.nomineeProofDocument[0].path, nomineeProofPath);
    uploadedUrls.push(nomineeProofDocument);

    // After uploading, purge local file copies
    cleanupLocalFiles(req.files);
  } catch (error) {
    cleanupLocalFiles(req.files);
    await deleteFirebaseFiles(uploadedUrls);
    return next(new AppError(`Document upload failed: ${error.message}`, 500));
  }

  // Define database variables outside to perform rollback on error
  let createdUser, createdProfile;

  try {
    // 6) Create the User document
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

    // 7) Create the ClientProfile document
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
      panDocument,
      aadhaarDocument,
      bankProofDocument,
      agreementDocument,
      nomineeProofDocument,
      status: 'active',
      kycStatus: kycStatus || 'PENDING',
      tier: finalTier,
      contractEndDate: finalContractEndDate,
      agentCommission: finalAgentCommission,
      portalPassword: tempPassword,
    });
  } catch (dbError) {
    // Rollback: Delete user and profile if either creation fails
    if (createdUser) {
      await User.findByIdAndDelete(createdUser._id);
    }
    await deleteFirebaseFiles(uploadedUrls);
    return next(new AppError(`Database transaction failed: ${dbError.message}`, 500));
  }

  try {
    // 8) Send Welcome Email containing credentials
    const loginUrl = process.env.CLIENT_PORTAL_URL || 'http://localhost:5173/client/login';
    await sendWelcomeEmail(email, fullName, clientCode, tempPassword, loginUrl);
  } catch (emailError) {
    console.error(`Welcome email failed to dispatch to ${email}:`, emailError.message);
    // Do not fail the request if just email fails, but notify the admin in metadata
  }

  // Clear password from return payload
  createdUser.password = undefined;

  res.status(201).json({
    success: true,
    message: 'Client onboarding completed successfully. Welcome email sent.',
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

  const users = await User.find(userQuery)
    .populate('assignedAgent', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await User.countDocuments(userQuery);

  const clientRecords = [];
  for (const user of users) {
    const profile = await ClientProfile.findOne({ userId: user._id });
    clientRecords.push({
      user,
      profile,
    });
  }

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
    'contractEndDate',
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
          // Delete old document from Firebase if it exists
          if (profile[field]) {
            try {
              await deleteFromFirebase(profile[field]);
            } catch (err) {
              console.error(`[Cleanup] Failed to delete old file ${profile[field]} from Firebase:`, err.message);
            }
          }

          // Upload new document
          const pathInBucket = `clients/${user.clientCode}/${field}_${Date.now()}`;
          const newUrl = await uploadToFirebase(req.files[field][0].path, pathInBucket);
          profileUpdates[field] = newUrl;
          uploadedUrls.push(newUrl);
        }
      }
      cleanupLocalFiles(req.files);
    }
  } catch (uploadError) {
    cleanupLocalFiles(req.files);
    await deleteFirebaseFiles(uploadedUrls);
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

  // 1) Purge documents from Firebase storage if they exist
  if (profile) {
    const documentsToPurge = [
      profile.panDocument,
      profile.aadhaarDocument,
      profile.bankProofDocument,
      profile.agreementDocument,
      profile.nomineeProofDocument,
    ];
    await deleteFirebaseFiles(documentsToPurge);
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

module.exports = {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  deleteClient,
  previewClientDashboard,
  getAllAgents,
  updateClientRoiRate,
};
