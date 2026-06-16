const express = require('express');
const authRoutes = require('./src/routes/auth/auth.routes');
const superAdminRoutes = require('./src/routes/super-admin/superAdmin.routes');

const router = express.Router();

// Register auth-related endpoints
router.use('/auth', authRoutes);

// Register super-admin-related endpoints
router.use('/super-admin', superAdminRoutes);

module.exports = router;
