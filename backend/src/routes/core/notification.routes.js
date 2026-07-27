const express = require('express');
const notificationController = require('../../controllers/core/notification.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorization.middleware');
const { USER_ROLES } = require('../../utils/constants');

const router = express.Router();

router.use(verifyAuth);

/**
 * GET /api/notifications
 */
router.get('/', notificationController.getNotifications);

/**
 * POST /api/notifications
 */
router.post('/', authorize(USER_ROLES.ADMIN, USER_ROLES.OWNER), notificationController.createNotification);

/**
 * GET /api/notifications/stream
 */
router.get('/stream', notificationController.streamNotifications);

/**
 * POST /api/notifications/:id/read
 */
router.post('/:id/read', notificationController.markAsRead);

/**
 * POST /api/notifications/read-all
 */
router.post('/read-all', notificationController.markAllAsRead);

module.exports = router;
