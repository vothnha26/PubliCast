const express = require('express');
const notificationController = require('../../controllers/core/notification.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorization.middleware');
const { USER_ROLES } = require('../../utils/constants');

const router = express.Router();

router.use(verifyAuth);

/**
 * @openapi
 * tags:
 *   name: Notifications V2
 *   description: User notifications (v2 Envelope API)
 */

router.get('/', notificationController.getNotifications);
router.post('/', authorize(USER_ROLES.ADMIN, USER_ROLES.OWNER), notificationController.createNotification);
router.get('/stream', notificationController.streamNotifications);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);

module.exports = router;
