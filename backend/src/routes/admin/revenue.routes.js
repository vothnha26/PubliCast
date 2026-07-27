const express = require('express');
const revenueController = require('../../controllers/admin/revenue.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorization.middleware');
const { USER_ROLES } = require('../../utils/constants');

const router = express.Router();

router.use(verifyAuth);
router.use(authorize(USER_ROLES.ADMIN));

/**
 * GET /api/admin/revenue
 */
router.get('/', revenueController.getRevenueDashboard);

module.exports = router;
