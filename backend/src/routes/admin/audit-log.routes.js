const express = require('express');
const auditLogController = require('../../controllers/admin/audit-log.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorization.middleware');
const { USER_ROLES } = require('../../utils/constants');

const router = express.Router();

// Apply authentication and Admin role authorizations to all audit routes
router.use(verifyAuth);
router.use(authorize(USER_ROLES.ADMIN));

/**
 * GET /api/admin/audit-logs
 * Fetch all system audit logs
 */
router.get('/', (req, res, next) => auditLogController.getAuditLogs(req, res, next));

module.exports = router;
