jest.mock('../../src/repositories/core/outbox-event.repository', () => ({
  create: jest.fn().mockResolvedValue({ id: 'outbox-1' })
}));

jest.mock('../../src/services/workspace/socket/socket.manager', () => ({
  emitToUser: jest.fn(),
  io: { emit: jest.fn() }
}));

jest.mock('../../src/services/core/notification.realtime', () => ({
  broadcast: jest.fn()
}));

const { eventEmitter, EVENTS } = require('../../src/events/event-emitter');
const outboxEventRepository = require('../../src/repositories/core/outbox-event.repository');
const socketManager = require('../../src/services/workspace/socket/socket.manager');
const notificationRealtime = require('../../src/services/core/notification.realtime');
const { OUTBOX_EVENT_TYPES, OUTBOX_PRIORITY } = require('../../src/constants/outbox.constants');
const { initNotificationSubscriber, EMAIL_PREFERENCE_PRIORITY } = require('../../src/events/subscribers/notification.subscriber');
const { SOCKET_EVENTS } = require('../../src/utils/socket-constants');

describe('notification.subscriber', () => {
  beforeAll(() => {
    initNotificationSubscriber();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseNotification = {
    id: 'notif-1',
    userId: 'user-1',
    title: 'Post failed',
    message: 'Your post failed to publish',
    actionUrl: '/planner'
  };

  describe('socket push', () => {
    it('emits to the target user room when the notification has a userId', async () => {
      eventEmitter.emit(EVENTS.NOTIFICATION.CREATED, { notification: baseNotification, preferenceKey: null });
      // socket push is synchronous inside the listener; flush microtasks for outbox's async listener
      await Promise.resolve();

      expect(socketManager.emitToUser).toHaveBeenCalledWith('user-1', SOCKET_EVENTS.NOTIFICATION_CREATED, {
        notificationId: 'notif-1',
        title: 'Post failed',
        message: 'Your post failed to publish'
      });
      expect(notificationRealtime.broadcast).toHaveBeenCalledWith('notification.created', { notificationId: 'notif-1' });
    });

    it('broadcasts globally via socketManager.io when the notification has no userId', async () => {
      eventEmitter.emit(EVENTS.NOTIFICATION.CREATED, {
        notification: { ...baseNotification, userId: null },
        preferenceKey: null
      });
      await Promise.resolve();

      expect(socketManager.emitToUser).not.toHaveBeenCalled();
      expect(socketManager.io.emit).toHaveBeenCalledWith(SOCKET_EVENTS.NOTIFICATION_CREATED, {
        notificationId: 'notif-1',
        title: 'Post failed',
        message: 'Your post failed to publish'
      });
    });
  });

  describe('email outbox', () => {
    it('queues a NOTIFICATION_EMAIL outbox row at HIGH priority for notifyPostFailure', async () => {
      eventEmitter.emit(EVENTS.NOTIFICATION.CREATED, { notification: baseNotification, preferenceKey: 'notifyPostFailure' });
      await Promise.resolve();
      await Promise.resolve();

      expect(outboxEventRepository.create).toHaveBeenCalledWith(
        OUTBOX_EVENT_TYPES.NOTIFICATION_EMAIL,
        'notif-1',
        expect.objectContaining({
          userId: 'user-1',
          title: 'Post failed',
          message: 'Your post failed to publish',
          actionUrl: expect.stringContaining('/planner')
        }),
        { priority: OUTBOX_PRIORITY.HIGH, nextRunAt: undefined }
      );
    });

    it('queues at LOW priority for notifyDailyRecap and forwards a caller-supplied nextRunAt', async () => {
      const nextRunAt = new Date();
      eventEmitter.emit(EVENTS.NOTIFICATION.CREATED, {
        notification: baseNotification,
        preferenceKey: 'notifyDailyRecap',
        emailOptions: { nextRunAt }
      });
      await Promise.resolve();
      await Promise.resolve();

      expect(outboxEventRepository.create).toHaveBeenCalledWith(
        OUTBOX_EVENT_TYPES.NOTIFICATION_EMAIL,
        'notif-1',
        expect.anything(),
        { priority: OUTBOX_PRIORITY.LOW, nextRunAt }
      );
    });

    it('does not queue an email for preference keys not in EMAIL_PREFERENCE_PRIORITY (e.g. notifyPublishSuccess)', async () => {
      expect(EMAIL_PREFERENCE_PRIORITY.notifyPublishSuccess).toBeUndefined();

      eventEmitter.emit(EVENTS.NOTIFICATION.CREATED, { notification: baseNotification, preferenceKey: 'notifyPublishSuccess' });
      await Promise.resolve();
      await Promise.resolve();

      expect(outboxEventRepository.create).not.toHaveBeenCalled();
    });

    it('does not queue an email for isGlobal/brand-wide notifications with no userId', async () => {
      eventEmitter.emit(EVENTS.NOTIFICATION.CREATED, {
        notification: { ...baseNotification, userId: null },
        preferenceKey: 'notifyPostFailure'
      });
      await Promise.resolve();
      await Promise.resolve();

      expect(outboxEventRepository.create).not.toHaveBeenCalled();
    });

    it('a failure to enqueue the email is swallowed and does not throw back through emit()', async () => {
      outboxEventRepository.create.mockRejectedValueOnce(new Error('DB down'));

      expect(() => {
        eventEmitter.emit(EVENTS.NOTIFICATION.CREATED, { notification: baseNotification, preferenceKey: 'notifyBilling' });
      }).not.toThrow();

      await Promise.resolve();
      await Promise.resolve();
    });
  });
});
