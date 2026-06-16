const express = require('express');
const {
  setupAdmin,
  login,
  verify2FA,
  getProfile,
  updateProfile,
  changePassword,
  logout,
} = require('../../controllers/auth/auth.controller');
const {
  setupAdminValidationRules,
  loginValidationRules,
  verify2FAValidationRules,
  updateProfileValidationRules,
  changePasswordValidationRules,
} = require('../../validations/auth.validation');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Public Authentication Flow Routes
router.post('/setup-admin', setupAdminValidationRules, setupAdmin);
router.post('/login', loginValidationRules, login);
router.post('/verify-2fa', verify2FAValidationRules, verify2FA);

// Protected Routes (requires valid JWT authorization)
router.get('/profile', protect, getProfile);
router.patch('/profile', protect, updateProfileValidationRules, updateProfile);
router.patch('/change-password', protect, changePasswordValidationRules, changePassword);
router.post('/logout', logout);

module.exports = router;
