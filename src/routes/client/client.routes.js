const express = require('express');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles');

const {
  login,
  logout,
  getMe,
} = require('../../controllers/client/client-auth.controller');

const {
  getClientDashboard,
  getClientInvestments,
  getClientInvestmentById,
  getClientProfile,
  updateClientProfile,
  getClientDocuments,
} = require('../../controllers/client/client-dashboard.controller');

const {
  updateClientProfileRules,
} = require('../../validations/client/client.validation');

const {
  sendChangePasswordOtpRules,
  verifyChangePasswordOtpRules,
} = require('../../validations/super-admin/change-password.validation');

const {
  sendChangePasswordOtpHandler,
  verifyChangePasswordOtp,
} = require('../../controllers/super-admin/change-password.controller');

const router = express.Router();

// --- PUBLIC CLIENT PORTAL AUTHENTICATION FLOW ---
router.post('/auth/login', login);
router.post('/auth/logout', logout);

// --- PROTECTED CLIENT PORTAL ENDPOINTS (Restricted to client role only) ---
router.use(protect);
router.use(restrictTo(ROLES.CLIENT));

// 1. Session Information
router.get('/auth/me', getMe);

// 2. Client Dashboard Stats
router.get('/dashboard', getClientDashboard);

// 3. Client Investment Management
router.get('/investments', getClientInvestments);
router.get('/investments/:id', getClientInvestmentById);

// 4. Client Profile Info
router.get('/profile', getClientProfile);
router.patch('/profile', updateClientProfileRules, updateClientProfile);

// 5. Client Documents Retrieval
router.get('/documents', getClientDocuments);

// 6. Settings - Change Password Flow (OTP verified)
router.post('/settings/change-password/send-otp', sendChangePasswordOtpRules, sendChangePasswordOtpHandler);
router.post('/settings/change-password/verify-otp', verifyChangePasswordOtpRules, verifyChangePasswordOtp);

module.exports = router;
