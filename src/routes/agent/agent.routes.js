const express = require('express');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles');

const {
  login,
  logout,
  getMe,
} = require('../../controllers/agent/agent-auth.controller');

const {
  getAgentDashboard,
  getAgentClients,
  getAgentCommissions,
  getAgentProfile,
  getAgentDocuments,
} = require('../../controllers/agent/agent-dashboard.controller');

const router = express.Router();

// --- PUBLIC AGENT PORTAL AUTHENTICATION FLOW ---
router.post('/auth/login', login);
router.post('/auth/logout', logout);

// --- PROTECTED AGENT PORTAL ENDPOINTS (Restricted to agent role only) ---
router.use(protect);
router.use(restrictTo(ROLES.AGENT));

// 1. Session Information
router.get('/auth/me', getMe);

// 2. Agent Dashboard Stats
router.get('/dashboard', getAgentDashboard);

// 3. Agent Client List
router.get('/clients', getAgentClients);

// 4. Agent Commission History
router.get('/commissions', getAgentCommissions);

// 5. Agent Profile Info
router.get('/profile', getAgentProfile);

// 6. Agent Documents Retrieval
router.get('/documents', getAgentDocuments);

// 7. Settings - Change Password Flow (OTP verified)
const {
  sendChangePasswordOtpRules,
  verifyChangePasswordOtpRules,
} = require('../../validations/super-admin/change-password.validation');

const {
  sendChangePasswordOtpHandler,
  verifyChangePasswordOtp,
} = require('../../controllers/super-admin/change-password.controller');

router.post('/settings/change-password/send-otp', sendChangePasswordOtpRules, sendChangePasswordOtpHandler);
router.post('/settings/change-password/verify-otp', verifyChangePasswordOtpRules, verifyChangePasswordOtp);

module.exports = router;
