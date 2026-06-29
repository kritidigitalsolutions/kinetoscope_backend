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

module.exports = router;
