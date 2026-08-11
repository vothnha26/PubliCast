const notificationService = require('../../services/core/notification.service');
const notificationRealtime = require('../../services/core/notification.realtime');
const asyncHandler = require('../../utils/async-handler');
const { v2Success } = require('../../utils/response.helper');

class NotificationControllerV2 {
  // Keeps v1's flat { message, data, meta } shape (not nested under data)
  // — same reasoning as admin's audit-log endpoint: apiV2's pagination
  // unwrap depends on top-level meta.
  getNotifications = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;
    const brandId = req.query.brandId || null;
    const result = await notificationService.getNotifications(req.query, userId, brandId, role);

    res.status(200).json({
      message: 'Notifications retrieved successfully',
      ...result
    });
  });

  createNotification = asyncHandler(async (req, res) => {
    const notification = await notificationService.create(req.body, {
      userId: req.user.id,
      role: req.user.role
    });

    v2Success(res, notification, 'Notification created successfully', 201);
  });

  markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;
    const brandId = req.query.brandId || null;
    await notificationService.markAsRead(id, userId, brandId, role);
    v2Success(res, null, 'Notification marked as read');
  });

  markAllAsRead = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;
    const brandId = req.query.brandId || null;
    await notificationService.markAllAsRead(userId, brandId, role);
    v2Success(res, null, 'All notifications marked as read');
  });

  // Server-Sent Events stream — not JSON, keeps v1's exact behavior.
  streamNotifications = asyncHandler(async (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.flushHeaders?.();

    const unsubscribe = notificationRealtime.subscribe(req.user.id, res);

    if (req.query.once === 'true') {
      unsubscribe();
      res.end();
      return;
    }

    res.on('close', () => {
      unsubscribe();
    });
  });
}

module.exports = new NotificationControllerV2();
