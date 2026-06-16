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
} = require('../../validations/investment.validation');
const {
  getSettings,
  toggle2FA,
} = require('../../controllers/super-admin/settings.controller');
const {
  sendChangeEmailOtpHandler,
  verifyChangeEmailOtp,
} = require('../../controllers/super-admin/changeEmail.controller');
const {
  sendChangePasswordOtpHandler,
  verifyChangePasswordOtp,
} = require('../../controllers/super-admin/changePassword.controller');
const {
  sendChangeEmailOtpRules,
  verifyChangeEmailOtpRules,
} = require('../../validations/changeEmail.validation');
const {
  sendChangePasswordOtpRules,
  verifyChangePasswordOtpRules,
} = require('../../validations/changePassword.validation');

const router = express.Router();

// Apply Auth and Role Guard to all Super Admin endpoints
router.use(protect);
router.use(restrictTo(ROLES.SUPER_ADMIN));

// 1. Dashboard Analytics
router.get('/dashboard/analytics', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Dashboard Analytics placeholder' });
});

// 2. Investor Management
router.route('/investors')
  .get((req, res) => res.status(200).json({ status: 'success', message: 'List Investors placeholder' }))
  .post((req, res) => res.status(201).json({ status: 'success', message: 'Create Investor placeholder' }));

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
  .get((req, res) => res.status(200).json({ status: 'success', message: 'List Agents placeholder' }))
  .post((req, res) => res.status(201).json({ status: 'success', message: 'Create Agent placeholder' }));

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

module.exports = router;
