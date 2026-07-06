const express = require('express');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles');

const {
  login,
  verify2FA,
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
  getPublishedArticles,
  getPublishedArticleById,
} = require('../../controllers/super-admin/article.controller');

const {
  getMyPerks,
} = require('../../controllers/super-admin/perk.controller');

const {
  getClientProjects,
} = require('../../controllers/super-admin/project.controller');

const {
  getClientAllotments,
  getClientDividendStats,
} = require('../../controllers/super-admin/dividend.controller');

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
router.post('/auth/verify-2fa', verify2FA);
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

// 7. News & Articles (Reader)
router.get('/articles', getPublishedArticles);
router.get('/articles/:id', getPublishedArticleById);

// 8. Assigned Perks (Client view)
router.get('/perks', getMyPerks);

// 9. Portfolio Projects (Client view)
router.get('/projects', getClientProjects);

// 10. Dividends & Allotment Ledger (Client view)
router.get('/dividends', getClientAllotments);
router.get('/dividends/stats', getClientDividendStats);

// 11. Transaction requests (deposit / withdrawal)
const {
  requestTransaction,
  getClientTransactions,
} = require('../../controllers/client/transaction.controller');

router.route('/transactions')
  .get(getClientTransactions)
  .post(requestTransaction);

// 12. Client direct messaging/notifications
const { sendClientNotificationEmail } = require('../../controllers/client/notification.controller');
router.post('/notifications/send-email', sendClientNotificationEmail);

module.exports = router;
