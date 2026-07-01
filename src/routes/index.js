const express = require('express');
const authRoutes = require('./auth/auth.routes');
const superAdminRoutes = require('./super-admin/super-admin.routes');
const clientRoutes = require('./client/client.routes');
const agentRoutes = require('./agent/agent.routes');

const router = express.Router();

// Register auth-related endpoints
router.use('/auth', authRoutes);

// Register super-admin-related endpoints
router.use('/super-admin', superAdminRoutes);

// Register client portal endpoints
router.use('/client', clientRoutes);

// Register agent portal endpoints
router.use('/agent', agentRoutes);

module.exports = router;
