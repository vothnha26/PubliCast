/**
 * Regression test for issue #83: change-password must require newPassword
 * to be at least 8 characters, matching resetPasswordValidation's policy
 * (previously only 6 was enforced here).
 */
jest.mock('../../src/services/auth/profile.service', () => ({
  changePassword: jest.fn()
}));

const profileController = require('../../src/controllers/auth/profile.controller');
const profileService = require('../../src/services/auth/profile.service');

function fakeReqRes(body) {
  const req = { user: { id: 'user-1' }, body };
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
  return { req, res };
}

describe('ProfileController.changePassword min length (#83)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects a 7-character password with 400', async () => {
    const { req, res } = fakeReqRes({ currentPassword: 'old', newPassword: '1234567' });

    await profileController.changePassword(req, res, () => {});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('8 ký tự');
    expect(profileService.changePassword).not.toHaveBeenCalled();
  });

  test('accepts an 8-character password', async () => {
    profileService.changePassword.mockResolvedValue({ message: 'ok' });
    const { req, res } = fakeReqRes({ currentPassword: 'old', newPassword: '12345678' });

    await profileController.changePassword(req, res, () => {});

    expect(profileService.changePassword).toHaveBeenCalledWith('user-1', 'old', '12345678');
    expect(res.statusCode).toBe(200);
  });

  test('rejects a missing newPassword', async () => {
    const { req, res } = fakeReqRes({ currentPassword: 'old' });

    await profileController.changePassword(req, res, () => {});

    expect(res.statusCode).toBe(400);
    expect(profileService.changePassword).not.toHaveBeenCalled();
  });
});
