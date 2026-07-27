const express = require('express');
const platformLimitController = require('../../controllers/admin/platform-limit.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorization.middleware');
const { USER_ROLES } = require('../../utils/constants');

const router = express.Router();

router.use(verifyAuth);
router.use(authorize(USER_ROLES.ADMIN));

/**
 * GET /api/admin/platform-limits
 */
router.get('/', platformLimitController.getPlatformLimits);

/**
 * GET /api/admin/platform-limits/:id
 */
router.get('/:id', platformLimitController.getPlatformLimitById);

/**
 * POST /api/admin/platform-limits
 */
router.post('/', platformLimitController.createPlatformLimit);

/**
 * PUT /api/admin/platform-limits/:id
 */
router.put('/:id', platformLimitController.updatePlatformLimit);

/**
 * PATCH /api/admin/platform-limits/:id/lock
 */
router.patch('/:id/lock', platformLimitController.toggleLock);

/**
 * DELETE /api/admin/platform-limits/:id
 */
router.delete('/:id', platformLimitController.deletePlatformLimit);

module.exports = router;
