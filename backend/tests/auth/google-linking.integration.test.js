const userRepository = require('../../src/repositories/auth/user.repository');
const prisma = require('../../src/config/prisma');
const bcrypt = require('bcryptjs');

// Mock Redis config to prevent connection attempts during tests
jest.mock('../../src/config/redis', () => ({
  on: jest.fn(),
  connect: jest.fn(),
  isOpen: true,
  get: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  flushDb: jest.fn()
}));

describe('Google Account Linking Integration Tests', () => {
  const testEmail = 'linktest@example.com';
  const testName = 'Link Test User';
  const testPassword = 'localPassword123';
  let localUserId;

  beforeAll(async () => {
    // 1. Clean up test users first
    await prisma.userAccount.deleteMany({
      where: {
        user: {
          email: {
            in: [testEmail, 'newgoogle@example.com', 'newgoogle-settings@example.com']
          }
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: [testEmail, 'newgoogle@example.com', 'newgoogle-settings@example.com']
        }
      }
    });

    // 2. Create a local email/password user
    const passwordHash = await bcrypt.hash(testPassword, 10);
    const user = await userRepository.createUser(
      {
        email: testEmail,
        fullName: testName,
        isActive: true,
        isEmailVerified: true
      },
      {
        provider: 'LOCAL',
        passwordHash
      }
    );
    localUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.userAccount.deleteMany({
      where: {
        user: {
          email: {
            in: [testEmail, 'newgoogle@example.com', 'newgoogle-settings@example.com']
          }
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: [testEmail, 'newgoogle@example.com', 'newgoogle-settings@example.com']
        }
      }
    });
  });

  it('should automatically link Google account to existing LOCAL user if emails match', async () => {
    const googleUserData = {
      email: testEmail,
      name: 'Google Name Update',
      avatarUrl: 'http://example.com/avatar.jpg'
    };

    const googleAccountData = {
      provider: 'GOOGLE',
      providerId: 'google-oauth2-123456789'
    };

    // Act: Upsert social user (simulate Google Sign-In redirect callback)
    const result = await userRepository.upsertSocialUser(googleUserData, googleAccountData);

    // Assert: User returned should be the existing LOCAL user
    expect(result.user.id).toBe(localUserId);
    expect(result.isNew).toBe(false);

    // Assert: Database check - user should now have 2 accounts linked
    const userFromDb = await prisma.user.findUnique({
      where: { id: localUserId },
      include: { accounts: true }
    });

    expect(userFromDb.accounts).toHaveLength(2);
    const providers = userFromDb.accounts.map(acc => acc.provider);
    expect(providers).toContain('LOCAL');
    expect(providers).toContain('GOOGLE');

    const googleAcc = userFromDb.accounts.find(acc => acc.provider === 'GOOGLE');
    expect(googleAcc.providerId).toBe(googleAccountData.providerId);
  });

  it('should auto-create a new account when signing in with Google using an email that has no existing account', async () => {
    const newEmail = 'newgoogle@example.com';
    const newGoogleUserData = {
      email: newEmail,
      name: 'New Google User',
      avatarUrl: 'http://example.com/new-avatar.jpg'
    };

    const newGoogleAccountData = {
      provider: 'GOOGLE',
      providerId: 'google-oauth2-987654321'
    };

    // Act: Upsert social user (simulate Google Sign-In redirect callback for a new email).
    // Google has already verified the email belongs to whoever is
    // authenticating, so that's sufficient identity proof — the account is
    // created directly, no separate email/password + OTP registration step.
    const result = await userRepository.upsertSocialUser(newGoogleUserData, newGoogleAccountData);

    expect(result.isNew).toBe(true);
    expect(result.user.email).toBe(newEmail);
    expect(result.user.isActive).toBe(true);
    expect(result.user.isEmailVerified).toBe(true);
    expect(result.user.passwordHash).toBeNull();

    // Assert: A user was created for this email, with the Google account linked
    const userFromDb = await prisma.user.findUnique({
      where: { email: newEmail },
      include: { accounts: true }
    });
    expect(userFromDb).not.toBeNull();
    expect(userFromDb.accounts).toHaveLength(1);
    expect(userFromDb.accounts[0].provider).toBe('GOOGLE');
    expect(userFromDb.accounts[0].providerId).toBe(newGoogleAccountData.providerId);
  });

  it('should reject a Google "Connect account" attempt (Settings flow) when the session user does not resolve', async () => {
    const newEmail = 'newgoogle-settings@example.com';
    const newGoogleUserData = {
      email: newEmail,
      name: 'New Google Settings User',
      avatarUrl: 'http://example.com/new-avatar-2.jpg'
    };
    const newGoogleAccountData = {
      provider: 'GOOGLE',
      providerId: 'google-oauth2-settings-111'
    };

    // A currentUserId that doesn't resolve to a real user (expired/invalid
    // session token during Settings' "Connect Google" flow) must not fall
    // through to auto-creating an unrelated new account.
    await expect(
      userRepository.upsertSocialUser(newGoogleUserData, newGoogleAccountData, 'nonexistent-user-id')
    ).rejects.toMatchObject({ code: 'GOOGLE_ACCOUNT_NOT_LINKED' });

    const userFromDb = await prisma.user.findUnique({ where: { email: newEmail } });
    expect(userFromDb).toBeNull();
  });

  it('should allow unlinking Google account if user has more than one account', async () => {
    const profileService = require('../../src/services/auth/profile.service');

    // 1. Unlink Google account (localUserId has LOCAL and GOOGLE accounts)
    const res = await profileService.unlinkAccount(localUserId, 'GOOGLE');
    expect(res.message).toContain('thành công');

    // 2. Assert in DB that GOOGLE is deleted and LOCAL remains
    const userFromDb = await prisma.user.findUnique({
      where: { id: localUserId },
      include: { accounts: true }
    });
    expect(userFromDb.accounts).toHaveLength(1);
    expect(userFromDb.accounts[0].provider).toBe('LOCAL');
  });

  it('should block unlinking the only remaining account', async () => {
    const profileService = require('../../src/services/auth/profile.service');

    // Attempt to unlink the last account (LOCAL)
    await expect(
      profileService.unlinkAccount(localUserId, 'LOCAL')
    ).rejects.toThrow('Bạn không thể hủy liên kết phương thức đăng nhập duy nhất.');
  });

  it('should allow changing password if local password matches', async () => {
    const profileService = require('../../src/services/auth/profile.service');

    // 1. Change password (testPassword -> newPassword123)
    const res = await profileService.changePassword(localUserId, testPassword, 'newPassword123');
    expect(res.message).toContain('thành công');

    // 2. Change it back using the new password to test
    const res2 = await profileService.changePassword(localUserId, 'newPassword123', testPassword);
    expect(res2.message).toContain('thành công');
  });

  it('should block changing password with incorrect current password', async () => {
    const profileService = require('../../src/services/auth/profile.service');

    await expect(
      profileService.changePassword(localUserId, 'wrongCurrentPassword', 'newPassword123')
    ).rejects.toThrow('Mật khẩu hiện tại không chính xác.');
  });
});
