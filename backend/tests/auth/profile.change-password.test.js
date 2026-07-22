/**
 * Regression test for issue #80: changePassword must revoke existing
 * refresh tokens (tokenService.clearTokens), matching what
 * resetPasswordWithToken already does — otherwise an attacker's refresh
 * token stays valid for its full 7-day TTL even after the victim changes
 * their password because they suspect a compromise.
 */
jest.mock('../../src/config/prisma', () => ({
  userAccount: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn()
  }
}));
jest.mock('../../src/services/auth/token.service', () => ({
  clearTokens: jest.fn()
}));
jest.mock('../../src/services/workspace/brand.service', () => ({}));
jest.mock('../../src/repositories/workspace/brand.repository', () => ({}));
jest.mock('../../src/repositories/auth/user.repository', () => ({}));
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('new-hashed-password')
}));

const profileService = require('../../src/services/auth/profile.service');
const prisma = require('../../src/config/prisma');
const tokenService = require('../../src/services/auth/token.service');
const bcrypt = require('bcryptjs');

describe('ProfileService.changePassword (#80)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('revokes existing refresh tokens after a successful password change', async () => {
    prisma.userAccount.findFirst.mockResolvedValue({ id: 'acc-1', passwordHash: 'old-hash' });
    bcrypt.compare.mockResolvedValue(true);
    prisma.userAccount.update.mockResolvedValue({});

    await profileService.changePassword('user-1', 'current-pass', 'new-password123');

    expect(tokenService.clearTokens).toHaveBeenCalledWith('user-1');
  });

  test('revokes tokens on first-time password setup for a social-login account too', async () => {
    prisma.userAccount.findFirst.mockResolvedValue(null);
    prisma.userAccount.create.mockResolvedValue({});

    await profileService.changePassword('user-1', undefined, 'new-password123');

    expect(tokenService.clearTokens).toHaveBeenCalledWith('user-1');
  });

  test('does NOT revoke tokens when the current password check fails', async () => {
    prisma.userAccount.findFirst.mockResolvedValue({ id: 'acc-1', passwordHash: 'old-hash' });
    bcrypt.compare.mockResolvedValue(false);

    await expect(profileService.changePassword('user-1', 'wrong-pass', 'new-password123'))
      .rejects.toThrow('Mật khẩu hiện tại không chính xác.');

    expect(tokenService.clearTokens).not.toHaveBeenCalled();
    expect(prisma.userAccount.update).not.toHaveBeenCalled();
  });
});
