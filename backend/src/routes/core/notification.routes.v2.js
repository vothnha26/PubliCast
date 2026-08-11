const express = require('express');
const notificationController = require('../../controllers/core/notification.controller.v2');
const { verifyAuth, verifyAuthFromQuery } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorization.middleware');
const { USER_ROLES } = require('../../utils/constants');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Notifications V2
 *   description: User notifications (v2 Envelope API)
 */

/**
 * @openapi
 * /v2/notifications/stream:
 *   get:
 *     summary: Subscribe to real-time notifications via Server-Sent Events
 *     description: >
 *       Opens a text/event-stream connection. Browser EventSource cannot send
 *       an Authorization header, so this endpoint additionally accepts the
 *       access token via a `token` query parameter (in addition to the
 *       accessToken cookie / Authorization header accepted everywhere else).
 *       This is the only endpoint in the API that accepts a token this way.
 *     tags: [Notifications V2]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: false
 *         schema: { type: string }
 *         description: Access token, used when the accessToken cookie/Authorization header is unavailable (e.g. cross-origin EventSource).
 *     responses:
 *       200:
 *         description: SSE stream opened
 *         content:
 *           text/event-stream:
 *             schema: { type: string }
 *       401:
 *         description: Access token required
 */
// EventSource can't send an Authorization header, so this route alone
// accepts the token via query string.
router.get('/stream', verifyAuthFromQuery, notificationController.streamNotifications);

router.use(verifyAuth);

router.get('/', notificationController.getNotifications);
router.post('/', authorize(USER_ROLES.ADMIN, USER_ROLES.OWNER), notificationController.createNotification);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);

module.exports = router;
