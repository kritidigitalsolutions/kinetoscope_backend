const express = require('express');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles');

const {
  login,
  verify2FA,
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

const {
  getAgentPerformanceRewards,
} = require('../../controllers/super-admin/performance-reward.controller');

const {
  getPublishedArticles,
  getPublishedArticleById,
} = require('../../controllers/super-admin/article.controller');

const router = express.Router();

// --- PUBLIC AGENT PORTAL AUTHENTICATION FLOW ---
router.post('/auth/login', login);
router.post('/auth/verify-2fa', verify2FA);
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

// 8. News & Articles (Reader)
router.get('/articles', getPublishedArticles);
router.get('/articles/:id', getPublishedArticleById);

// 9. Transaction requests (deposit / withdrawal on behalf of assigned client)
const {
  requestAgentTransaction,
  getAgentTransactions,
  requestAgentWithdrawal,
  getAgentWithdrawals,
} = require('../../controllers/agent/transaction.controller');

router.route('/transactions')
  .get(getAgentTransactions)
  .post(requestAgentTransaction);

router.route('/withdrawal')
  .get(getAgentWithdrawals)
  .post(requestAgentWithdrawal);

// 10. Agent direct messaging/notifications
const { sendAgentNotificationEmail } = require('../../controllers/agent/notification.controller');
router.post('/notifications/send-email', sendAgentNotificationEmail);

// 11. Performance Rewards Catalog (Agent view)
router.get('/rewards', getAgentPerformanceRewards);

// 12. Service Requests (Agent view)
const { createRequestRules } = require('../../validations/super-admin/service-request.validation');
const { createServiceRequest, getMyServiceRequests } = require('../../controllers/super-admin/service-request.controller');
const { memoryUpload } = require('../../middlewares/upload.middleware');

router.route('/service-requests')
  .get(getMyServiceRequests)
  .post(memoryUpload.single('attachment'), createRequestRules, createServiceRequest);

module.exports = router;
