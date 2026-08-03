const express = require('express');
const notificationController = require('../../controllers/core/notification.controller');
const { verifyAuth, verifyAuthFromQuery } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorization.middleware');
const { USER_ROLES } = require('../../utils/constants');

const router = express.Router();

/**
 * GET /api/notifications/stream
 * EventSource can't send an Authorization header, so this route alone
 * accepts the token via query string.
 */
router.get('/stream', verifyAuthFromQuery, notificationController.streamNotifications);

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
 * POST /api/notifications/:id/read
 */
router.post('/:id/read', notificationController.markAsRead);

/**
 * POST /api/notifications/read-all
 */
router.post('/read-all', notificationController.markAllAsRead);

module.exports = router;
