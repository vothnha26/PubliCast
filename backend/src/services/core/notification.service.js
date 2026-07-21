const notificationRepository = require('../../repositories/core/notification.repository');
const QueryPipeline = require('../../core/query-pipeline/query.pipeline');
const NotificationCategoryFilter = require('./notification/filters/category.filter');
const NotificationDateRangeFilter = require('./notification/filters/date-range.filter');
const brandRepository = require('../../repositories/workspace/brand.repository');
const authorizationFacade = require('../auth/authorization.facade');
const { NOTIFICATION_TYPES, NOTIFICATION_LABELS, USER_ROLES } = require('../../utils/constants');
const notificationRealtime = require('./notification.realtime');

class NotificationService {
  constructor() {
    this.queryPipeline = new QueryPipeline([
      new NotificationCategoryFilter(),
      new NotificationDateRangeFilter()
    ]);
  }

  /**
   * Get notifications for a user/brand
   */
  async getNotifications(queryParams, userId, brandId, role) {
    await this._assertBrandAccess(userId, brandId, role);

    const { page = 1, limit = 50 } = queryParams;
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (Math.max(1, parseInt(page) || 1) - 1) * safeLimit;

    const initialWhere = this._buildVisibilityWhere(userId, brandId);
    let where = this.queryPipeline.apply(initialWhere, queryParams);
    where = this._applyReadFilter(where, queryParams.isRead, userId);

    const { notifications, total } = await notificationRepository.findManyAndCount(where, { skip, take: safeLimit }, userId);
    const categoryCounts = await this.getCategoryCounts(userId, brandId);

    return {
      data: notifications.map(n => this._formatNotification(n)),
      meta: {
        total,
        page: Math.max(1, parseInt(page) || 1),
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
        categoryCounts
      }
    };
  }

  async create(notificationData, actor = null) {
    if (actor) {
      await this._assertCreatePermission(notificationData, actor);
    }

    const data = this._buildCreateData(notificationData);
    const notification = await notificationRepository.create(data);
    
    // Broadcast notification via WebSocket SocketManager
    try {
      const socketManager = require('../workspace/socket/socket.manager');
      const { SOCKET_EVENTS } = require('../../utils/socket-constants');
      if (notification.userId) {
        socketManager.emitToUser(notification.userId, SOCKET_EVENTS.NOTIFICATION_CREATED, {
          notificationId: notification.id,
          title: notification.title,
          message: notification.message
        });
      } else {
        // Global system notification
        if (socketManager.io) {
          socketManager.io.emit(SOCKET_EVENTS.NOTIFICATION_CREATED, {
            notificationId: notification.id,
            title: notification.title,
            message: notification.message
          });
        }
      }
    } catch (wsErr) {
      console.error('⚠️ [NotificationService] Real-time websocket dispatch failed:', wsErr.message);
    }

    notificationRealtime.broadcast('notification.created', { notificationId: notification.id });
    return this._formatNotification(notification);
  }

  async markAsRead(id, userId, brandId, role) {
    await this._assertBrandAccess(userId, brandId, role);

    const result = await notificationRepository.markAsRead({
      id,
      ...this._buildVisibilityWhere(userId, brandId)
    }, userId);

    if (!result.count) {
      const error = new Error('Notification not found or access denied');
      error.status = 404;
      throw error;
    }

    // Push read receipt over socket
    try {
      const socketManager = require('../workspace/socket/socket.manager');
      const { SOCKET_EVENTS } = require('../../utils/socket-constants');
      socketManager.emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_READ, { notificationId: id });
    } catch (wsErr) {
      console.error('⚠️ [NotificationService] Real-time read status update failed:', wsErr.message);
    }

    notificationRealtime.publishToUser(userId, 'notification.read', { notificationId: id });
    return result;
  }

  async markAllAsRead(userId, brandId, role) {
    await this._assertBrandAccess(userId, brandId, role);

    const where = {
      ...this._applyReadFilter(this._buildVisibilityWhere(userId, brandId), 'false', userId)
    };
    const result = await notificationRepository.markAllAsRead(where, userId);

    // Push read-all receipt over socket
    try {
      const socketManager = require('../workspace/socket/socket.manager');
      const { SOCKET_EVENTS } = require('../../utils/socket-constants');
      socketManager.emitToUser(userId, SOCKET_EVENTS.NOTIFICATIONS_READ_ALL, { count: result.count });
    } catch (wsErr) {
      console.error('⚠️ [NotificationService] Real-time read-all status update failed:', wsErr.message);
    }

    notificationRealtime.publishToUser(userId, 'notifications.read_all', { count: result.count });
    return result;
  }

  async getCategoryCounts(userId, brandId) {
    const baseWhere = this._buildVisibilityWhere(userId, brandId);
    const categories = Object.values(NOTIFICATION_TYPES);
    const counts = { all: 0 };

    await Promise.all(categories.map(async (cat) => {
      const count = await notificationRepository.count(this._applyReadFilter({ ...baseWhere, type: cat }, 'false', userId));
      counts[cat] = count;
      counts.all += count;
    }));

    return counts;
  }

  // ============= Private Helper Methods =============

  _isAdmin(role) {
    return String(role || '').toUpperCase() === USER_ROLES.ADMIN;
  }

  async _assertBrandAccess(userId, brandId, role) {
    if (!brandId || this._isAdmin(role)) return;

    const canAccess = await brandRepository.userCanAccessBrand(userId, brandId);
    if (!canAccess) {
      const error = new Error('Access denied for this brand');
      error.status = 403;
      throw error;
    }
  }

  async _assertCreatePermission(data, actor) {
    const role = actor.role;

    if (this._isAdmin(role)) {
      return;
    }

    if (data?.isGlobal) {
      const error = new Error('Only admin can create global notifications');
      error.status = 403;
      throw error;
    }

    if (!data?.brandId) {
      const error = new Error('Non-admin users can only create brand-scoped notifications');
      error.status = 403;
      throw error;
    }

    await this._assertBrandAccess(actor.userId, data.brandId, role);

    // _assertBrandAccess above only verifies the ACTOR belongs to brandId —
    // it never checked whether the TARGET user (data.userId, which
    // _buildCreateData copies straight from the request body) is even a
    // member of that brand. A non-admin OWNER could POST { brandId: <their
    // own brand>, userId: <any other user's id>, actionUrl: <phishing link> }
    // and have it delivered (+ pushed over socket) to a total stranger
    // (#81). Require the target — if one is supplied — to actually belong
    // to the same brand.
    if (data?.userId) {
      const targetHasAccess = await authorizationFacade.checkBrandAccess(data.userId, data.brandId);
      if (!targetHasAccess) {
        const error = new Error('Target user is not a member of this brand');
        error.status = 403;
        throw error;
      }
    }
  }

  _buildVisibilityWhere(userId, brandId) {
    const conditions = [{ userId }, { isGlobal: true }];

    if (brandId) {
      conditions.splice(1, 0, { brandId });
    }

    return { OR: conditions };
  }

  _applyReadFilter(where, isRead, userId) {
    if (isRead === undefined || isRead === '') {
      return where;
    }

    const readReceiptCondition = { readReceipts: { some: { userId } } };

    if (isRead === 'true') {
      return {
        AND: [
          where,
          {
            OR: [
              { isRead: true },
              readReceiptCondition
            ]
          }
        ]
      };
    }

    if (isRead === 'false') {
      return {
        AND: [
          where,
          { isRead: false },
          { readReceipts: { none: { userId } } }
        ]
      };
    }

    return where;
  }

  _buildCreateData(data) {
    const source = data || {};
    const title = source.title?.trim();
    const message = source.message?.trim();
    const type = source.type || NOTIFICATION_TYPES.SYSTEM;

    if (!title) {
      const error = new Error('Notification title is required');
      error.status = 400;
      throw error;
    }

    if (!message) {
      const error = new Error('Notification message is required');
      error.status = 400;
      throw error;
    }

    if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
      const error = new Error('Invalid notification type');
      error.status = 400;
      throw error;
    }

    return {
      userId: source.userId || null,
      brandId: source.brandId || null,
      title,
      message,
      type,
      isGlobal: Boolean(source.isGlobal),
      actionUrl: source.actionUrl || null
    };
  }

  _formatNotification(n) {
    const hasReadReceipt = Array.isArray(n.readReceipts) && n.readReceipts.length > 0;

    return {
      id: n.id,
      title: n.title,
      desc: n.message,
      category: n.type,
      isRead: Boolean(n.isRead || hasReadReceipt),
      action: this._getActionLabel(n.type),
      actionUrl: n.actionUrl,
      createdAt: n.createdAt,
      time: this._formatTimeAgo(n.createdAt),
      bg: this._getCategoryColor(n.type)
    };
  }

  _getActionLabel(type) {
    const labels = {
      [NOTIFICATION_TYPES.STREAM]: NOTIFICATION_LABELS.ACTION.MONITOR,
      [NOTIFICATION_TYPES.CONTENT]: NOTIFICATION_LABELS.ACTION.REVIEW,
      [NOTIFICATION_TYPES.PLATFORM]: NOTIFICATION_LABELS.ACTION.RECONNECT,
      [NOTIFICATION_TYPES.TEAM]: NOTIFICATION_LABELS.ACTION.VIEW_TEAM,
      [NOTIFICATION_TYPES.SYSTEM]: NOTIFICATION_LABELS.ACTION.MANAGE
    };
    return labels[type] || NOTIFICATION_LABELS.ACTION.VIEW;
  }

  _getCategoryColor(type) {
    const colors = {
      [NOTIFICATION_TYPES.STREAM]: '#DC2626',
      [NOTIFICATION_TYPES.CONTENT]: '#D97706',
      [NOTIFICATION_TYPES.PLATFORM]: '#D97706',
      [NOTIFICATION_TYPES.TEAM]: '#374151',
      [NOTIFICATION_TYPES.SYSTEM]: '#6B7280'
    };
    return colors[type] || '#0A0A0A';
  }

  _formatTimeAgo(date) {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return NOTIFICATION_LABELS.TIME.JUST_NOW;
    if (minutes < 60) return `${minutes} ${NOTIFICATION_LABELS.TIME.MIN_AGO}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}${NOTIFICATION_LABELS.TIME.HOUR_AGO}`;
    return `${Math.floor(hours / 24)}${NOTIFICATION_LABELS.TIME.DAY_AGO}`;
  }
}

module.exports = new NotificationService();
