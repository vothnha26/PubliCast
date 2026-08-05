jest.mock('../../src/services/auth/profile.service', () => ({
  getNotificationSettings: jest.fn(),
  updateNotificationSettings: jest.fn()
}));

const profileControllerV2 = require('../../src/controllers/auth/profile.controller.v2');
const profileService = require('../../src/services/auth/profile.service');

function fakeReqRes(body = {}) {
  const req = { user: { id: 'user-1' }, body };
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; this.statusCode = this.statusCode || 200; return this; }
  };
  return { req, res };
}

describe('ProfileControllerV2 notification settings', () => {
  beforeEach(() => jest.clearAllMocks());

  test('GET returns the current preferences for the authenticated user', async () => {
    profileService.getNotificationSettings.mockResolvedValue({ notificationsEnabled: true });
    const { req, res } = fakeReqRes();

    await profileControllerV2.getNotificationSettings(req, res, () => {});

    expect(profileService.getNotificationSettings).toHaveBeenCalledWith('user-1');
    expect(res.body.data).toEqual({ notificationsEnabled: true });
  });

  test('PUT forwards the request body to the service and returns the updated preferences', async () => {
    profileService.updateNotificationSettings.mockResolvedValue({ notifyBilling: false });
    const { req, res } = fakeReqRes({ notifyBilling: false });

    await profileControllerV2.updateNotificationSettings(req, res, () => {});

    expect(profileService.updateNotificationSettings).toHaveBeenCalledWith('user-1', { notifyBilling: false });
    expect(res.body.data).toEqual({ notifyBilling: false });
  });

  test('GET forwards service errors to next() instead of throwing', async () => {
    const error = new Error('DB down');
    profileService.getNotificationSettings.mockRejectedValue(error);
    const { req, res } = fakeReqRes();
    const next = jest.fn();

    await profileControllerV2.getNotificationSettings(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
