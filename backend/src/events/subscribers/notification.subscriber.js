const { eventEmitter, EVENTS } = require('../event-emitter');
const outboxEventRepository = require('../../repositories/core/outbox-event.repository');
const { OUTBOX_EVENT_TYPES, OUTBOX_PRIORITY } = require('../../constants/outbox.constants');
const appConfig = require('../../config/app.config');
const logger = require('../../utils/logger');

/**
 * Which preferenceKey also gets an email, and at what Outbox priority.
 * Keys not listed here stay in-app only (bell/socket) — publish success,
 * collaboration and empty-queue are frequent/low-stakes enough that an email
 * per event would just be noise. Post failures and channel disconnects need
 * to reach the user even when they're not watching the app; billing is
 * money-related; recap is informational but low urgency (LOW priority so it
 * never crowds out OTP/failure emails in the same Outbox batch — see
 * outbox.constants.js).
 */
const EMAIL_PREFERENCE_PRIORITY = {
  notifyPostFailure: OUTBOX_PRIORITY.HIGH,
  notifyChannelDisconnect: OUTBOX_PRIORITY.HIGH,
  notifyBilling: OUTBOX_PRIORITY.HIGH,
  notifyDailyRecap: OUTBOX_PRIORITY.LOW,
  notifyWeeklyReport: OUTBOX_PRIORITY.LOW
};

/** Real-time bell/socket push — identical to what notification.service.js#create() did inline before this was split out. */
function handleSocketPush({ notification }) {
  try {
    const socketManager = require('../../services/workspace/socket/socket.manager');
    const { SOCKET_EVENTS } = require('../../utils/socket-constants');
    if (notification.userId) {
      socketManager.emitToUser(notification.userId, SOCKET_EVENTS.NOTIFICATION_CREATED, {
        notificationId: notification.id,
        title: notification.title,
        message: notification.message
      });
    } else if (socketManager.io) {
      socketManager.io.emit(SOCKET_EVENTS.NOTIFICATION_CREATED, {
        notificationId: notification.id,
        title: notification.title,
        message: notification.message
      });
    }
  } catch (err) {
    console.error('⚠️ [NotificationSubscriber] Real-time websocket dispatch failed:', err.message);
  }

  try {
    const notificationRealtime = require('../../services/core/notification.realtime');
    notificationRealtime.broadcast('notification.created', { notificationId: notification.id });
  } catch (err) {
    console.error('⚠️ [NotificationSubscriber] notificationRealtime broadcast failed:', err.message);
  }
}

/**
 * Queues an email via Outbox for the preference keys in EMAIL_PREFERENCE_PRIORITY.
 * Best-effort: a failure to enqueue must never block or roll back the notification
 * itself, so errors are swallowed here (Outbox write failures are logged, not thrown).
 */
async function handleEmailOutbox({ notification, preferenceKey, emailOptions = {} }) {
  if (!notification.userId || !preferenceKey) return;

  const priority = EMAIL_PREFERENCE_PRIORITY[preferenceKey];
  if (priority === undefined) return;

  try {
    const actionUrl = notification.actionUrl
      ? `${appConfig.frontendUrl}${notification.actionUrl}`
      : null;
    await outboxEventRepository.create(
      OUTBOX_EVENT_TYPES.NOTIFICATION_EMAIL,
      notification.id,
      { userId: notification.userId, title: notification.title, message: notification.message, actionUrl },
      { priority, nextRunAt: emailOptions.nextRunAt }
    );
  } catch (err) {
    logger.error('[NotificationSubscriber] Failed to enqueue notification email:', err.message);
  }
}

function initNotificationSubscriber() {
  eventEmitter.on(EVENTS.NOTIFICATION.CREATED, handleSocketPush);
  eventEmitter.on(EVENTS.NOTIFICATION.CREATED, handleEmailOutbox);
}

module.exports = { initNotificationSubscriber, EMAIL_PREFERENCE_PRIORITY };
