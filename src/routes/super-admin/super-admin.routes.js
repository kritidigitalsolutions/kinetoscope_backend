const express = require('express');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles');
const {
  createInvestment,
  getAllInvestments,
  getInvestmentById,
} = require('../../controllers/super-admin/investment.controller');
const {
  createInvestmentValidationRules,
} = require('../../validations/super-admin/investment.validation');
const {
  getSettings,
  toggle2FA,
} = require('../../controllers/super-admin/settings.controller');
const {
  sendChangeEmailOtpHandler,
  verifyChangeEmailOtp,
} = require('../../controllers/super-admin/change-email.controller');
const {
  sendChangePasswordOtpHandler,
  verifyChangePasswordOtp,
} = require('../../controllers/super-admin/change-password.controller');
const {
  sendChangeEmailOtpRules,
  verifyChangeEmailOtpRules,
} = require('../../validations/super-admin/change-email.validation');
const {
  sendChangePasswordOtpRules,
  verifyChangePasswordOtpRules,
} = require('../../validations/super-admin/change-password.validation');

// Client management controllers and validations
const {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  deleteClient,
  previewClientDashboard,
  updateClientRoiRate,
  verifyDocument,
} = require('../../controllers/super-admin/client-management.controller');

// Agent management controllers and validations
const {
  createAgent,
  getAllAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  getAgentClients,
  getAgentCommissions,
  updateAgentStatus,
  verifyAgentDocument,
} = require('../../controllers/super-admin/agent-management.controller');

const {
  createAgentValidationRules,
  updateAgentRulesByAdmin,
} = require('../../validations/super-admin/agent.validation');

const {
  getManageClients,
  exportClientsCSV,
} = require('../../controllers/super-admin/client-reporting.controller');

const {
  getClientInvestmentsTab,
  getClientRoiTab,
  markRoiPaid,
  getClientDocumentsTab,
  getClientPerksTab,
} = require('../../controllers/super-admin/client-financials.controller');

const {
  createClientValidationRules,
  updateClientRulesByAdmin,
} = require('../../validations/client/client.validation');

// Client portal management controllers and validations
const {
  listClientAccounts,
  getClientAccountDetails,
  updateClientStatus,
} = require('../../controllers/super-admin/client-portal.controller');

const {
  updateClientStatusRules,
} = require('../../validations/super-admin/client-portal.validation');

const upload = require('../../middlewares/upload.middleware');

// Configure Multer field parsing for client onboarding documents
const clientOnboardingUpload = upload.fields([
  { name: 'panDocument', maxCount: 1 },
  { name: 'aadhaarDocument', maxCount: 1 },
  { name: 'bankProofDocument', maxCount: 1 },
  { name: 'agreementDocument', maxCount: 1 },
  { name: 'nomineeProofDocument', maxCount: 1 },
]);

// Configure Multer field parsing for agent onboarding documents
const agentOnboardingUpload = upload.fields([
  { name: 'panDocument', maxCount: 1 },
  { name: 'idProofDocument', maxCount: 1 },
  { name: 'bankProofDocument', maxCount: 1 },
  { name: 'nomineeProofDocument', maxCount: 1 },
]);

const router = express.Router();

// Apply Auth and Role Guard to all Super Admin endpoints
router.use(protect);
router.use(restrictTo(ROLES.SUPER_ADMIN));

// 1. Dashboard Analytics
router.get('/dashboard/analytics', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Dashboard Analytics placeholder' });
});

// 2. Client / Investor Management
router.route('/clients')
  .get(getAllClients)
  .post(clientOnboardingUpload, createClientValidationRules, createClient);

router.get('/clients/manage', getManageClients);
router.get('/clients/manage/export', exportClientsCSV);

router.route('/clients/:id')
  .get(getClientById)
  .patch(clientOnboardingUpload, updateClientRulesByAdmin, updateClient)
  .delete(deleteClient);

router.get('/clients/:id/investments', getClientInvestmentsTab);
router.get('/clients/:id/roi', getClientRoiTab);
router.patch('/clients/:id/roi/:payoutId/pay', markRoiPaid);
router.patch('/clients/:id/roi-rate', updateClientRoiRate);
router.get('/clients/:id/documents', getClientDocumentsTab);
router.patch('/clients/:id/verify-document', verifyDocument);
router.get('/clients/:id/perks', getClientPerksTab);

// Client dashboard preview
router.get('/client-dashboard/:clientId', previewClientDashboard);

// 3. Investment Management — Read-only after assignment (immutable financial records)
router.route('/investments')
  .get(getAllInvestments)
  .post(createInvestmentValidationRules, createInvestment);

router.route('/investments/:id')
  .get(getInvestmentById);

// 4. ROI Management
router.route('/roi')
  .get((req, res) => res.status(200).json({ status: 'success', message: 'List ROI records placeholder' }))
  .post((req, res) => res.status(201).json({ status: 'success', message: 'Post ROI distributions placeholder' }));

// 5. Agent Management
router.route('/agents')
  .get(getAllAgents)
  .post(agentOnboardingUpload, createAgentValidationRules, createAgent);

router.route('/agents/:id')
  .get(getAgentById)
  .patch(agentOnboardingUpload, updateAgentRulesByAdmin, updateAgent)
  .delete(deleteAgent);

router.get('/agents/:id/clients', getAgentClients);
router.get('/agents/:id/commissions', getAgentCommissions);
router.patch('/agents/:id/status', updateAgentStatus);
router.patch('/agents/:id/verify-document', verifyAgentDocument);

// 6. Deposit & Withdrawal Approvals
router.route('/transactions/approvals')
  .get((req, res) => res.status(200).json({ status: 'success', message: 'List Pending Approvals placeholder' }));

router.patch('/transactions/:id/approve', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Approve Transaction placeholder' });
});

// 7. Perks & Recognition
router.route('/perks')
  .get((req, res) => res.status(200).json({ status: 'success', message: 'List Perks placeholder' }))
  .post((req, res) => res.status(201).json({ status: 'success', message: 'Configure Perk placeholder' }));

// 8. Activity Logs
router.get('/activity-logs', (req, res) => {
  res.status(200).json({ status: 'success', message: 'List System Activity Logs placeholder' });
});

// 9. Agreement Uploads
router.route('/agreements')
  .get((req, res) => res.status(200).json({ status: 'success', message: 'List Agreements placeholder' }))
  .post((req, res) => res.status(201).json({ status: 'success', message: 'Upload Agreement placeholder' }));
// 10. Settings — 2FA and profile preferences
router.get('/settings', getSettings);
router.patch('/settings/2fa', toggle2FA);

// 11. Settings — Change Email Address (OTP-based)
router.post('/settings/change-email/send-otp', sendChangeEmailOtpRules, sendChangeEmailOtpHandler);
router.post('/settings/change-email/verify-otp', verifyChangeEmailOtpRules, verifyChangeEmailOtp);

// 12. Settings — Change Password (OTP-based)
router.post('/settings/change-password/send-otp', sendChangePasswordOtpRules, sendChangePasswordOtpHandler);
router.post('/settings/change-password/verify-otp', verifyChangePasswordOtpRules, verifyChangePasswordOtp);

// 13. Client Portal Management — Account listing, details, status
router.get('/client-portal', listClientAccounts);
router.get('/client-portal/:clientId', getClientAccountDetails);
router.patch('/client-portal/:clientId/status', updateClientStatusRules, updateClientStatus);

module.exports = router;
