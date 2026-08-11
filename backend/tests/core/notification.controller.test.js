jest.mock('../../src/services/core/notification.service', () => ({
  getNotifications: jest.fn(),
  create: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn()
}));
jest.mock('../../src/services/core/notification.realtime', () => ({
  subscribe: jest.fn()
}));

const notificationService = require('../../src/services/core/notification.service');
const notificationController = require('../../src/controllers/core/notification.controller');
const notificationControllerV2 = require('../../src/controllers/core/notification.controller.v2');

function mockReqRes({ params = {}, query = {}, body = {}, user = { id: 'user-1', role: 'MEMBER' } } = {}) {
  const req = { params, query, body, user };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), set: jest.fn(), flushHeaders: jest.fn(), on: jest.fn(), end: jest.fn() };
  return { req, res };
}

function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('NotificationController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getNotifications: both keep the flat {message, data, meta} shape', async () => {
    notificationService.getNotifications.mockResolvedValue({ data: [{ id: 'n1' }], meta: { total: 1 } });

    const v1 = mockReqRes();
    await callHandler(notificationController.getNotifications, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ message: 'Notifications retrieved successfully', data: [{ id: 'n1' }], meta: { total: 1 } });

    const v2 = mockReqRes();
    await callHandler(notificationControllerV2.getNotifications, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Notifications retrieved successfully', data: [{ id: 'n1' }], meta: { total: 1 } });
  });

  it('createNotification: both return 201 with the created notification', async () => {
    notificationService.create.mockResolvedValue({ id: 'n1' });

    const v2 = mockReqRes({ body: { userId: 'u2', message: 'hi' } });
    await callHandler(notificationControllerV2.createNotification, v2.req, v2.res);
    expect(v2.res.status).toHaveBeenCalledWith(201);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Notification created successfully', data: { id: 'n1' } });
  });

  it('markAsRead / markAllAsRead: both return the same status message', async () => {
    notificationService.markAsRead.mockResolvedValue(undefined);

    const v1 = mockReqRes({ params: { id: 'n1' } });
    await callHandler(notificationController.markAsRead, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ message: 'Notification marked as read' });

    const v2 = mockReqRes({ params: { id: 'n1' } });
    await callHandler(notificationControllerV2.markAsRead, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Notification marked as read', data: null });
  });

  describe('streamNotifications', () => {
    it('sets SSE headers and subscribes, on both versions', async () => {
      const unsubscribe = jest.fn();
      const { subscribe } = require('../../src/services/core/notification.realtime');
      subscribe.mockReturnValue(unsubscribe);

      const v2 = mockReqRes({ query: {} });
      await callHandler(notificationControllerV2.streamNotifications, v2.req, v2.res);
      expect(v2.res.set).toHaveBeenCalledWith(expect.objectContaining({ 'Content-Type': 'text/event-stream' }));
      expect(subscribe).toHaveBeenCalledWith('user-1', v2.res);
    });
  });
});
