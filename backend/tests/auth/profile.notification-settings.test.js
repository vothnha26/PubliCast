/**
 * getNotificationSettings/updateNotificationSettings — per-category toggles
 * backing the Settings > Notifications UI. Users without a UserSettings row
 * yet must see the schema's defaults, not a 404 or undefined fields.
 */
jest.mock('../../src/config/prisma', () => ({
  userSettings: {
    findUnique: jest.fn(),
    upsert: jest.fn()
  }
}));
jest.mock('../../src/services/workspace/brand.service', () => ({}));
jest.mock('../../src/repositories/workspace/brand.repository', () => ({}));
jest.mock('../../src/repositories/auth/user.repository', () => ({}));
jest.mock('../../src/services/auth/token.service', () => ({}));

const profileService = require('../../src/services/auth/profile.service');
const prisma = require('../../src/config/prisma');

const ALL_TRUE_KEYS = [
  'notificationsEnabled', 'notifyPostFailure', 'notifyPublishSuccess',
  'notifyChannelDisconnect', 'notifyCollaboration', 'notifyBilling', 'notifyEmptyQueue'
];
const OPT_IN_KEYS = ['notifyDailyRecap', 'notifyWeeklyReport'];

describe('ProfileService notification settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNotificationSettings', () => {
    it('returns the schema defaults when the user has no UserSettings row yet', async () => {
      prisma.userSettings.findUnique.mockResolvedValue(null);

      const result = await profileService.getNotificationSettings('user-1');

      ALL_TRUE_KEYS.forEach((key) => expect(result[key]).toBe(true));
      OPT_IN_KEYS.forEach((key) => expect(result[key]).toBe(false));
    });

    it('returns the stored values when a row exists', async () => {
      prisma.userSettings.findUnique.mockResolvedValue({
        userId: 'user-1',
        notificationsEnabled: false,
        notifyPostFailure: false,
        notifyPublishSuccess: true,
        notifyChannelDisconnect: true,
        notifyCollaboration: true,
        notifyBilling: true,
        notifyEmptyQueue: true,
        notifyDailyRecap: true,
        notifyWeeklyReport: false
      });

      const result = await profileService.getNotificationSettings('user-1');

      expect(result.notificationsEnabled).toBe(false);
      expect(result.notifyPostFailure).toBe(false);
      expect(result.notifyDailyRecap).toBe(true);
    });
  });

  describe('updateNotificationSettings', () => {
    it('upserts only the boolean preference fields present in the update', async () => {
      prisma.userSettings.upsert.mockResolvedValue({
        userId: 'user-1',
        notificationsEnabled: true,
        notifyPostFailure: false,
        notifyPublishSuccess: true,
        notifyChannelDisconnect: true,
        notifyCollaboration: true,
        notifyBilling: true,
        notifyEmptyQueue: true,
        notifyDailyRecap: false,
        notifyWeeklyReport: false
      });

      await profileService.updateNotificationSettings('user-1', { notifyPostFailure: false });

      expect(prisma.userSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1', notifyPostFailure: false },
        update: { notifyPostFailure: false }
      });
    });

    it('ignores unknown keys and non-boolean values instead of writing them', async () => {
      prisma.userSettings.upsert.mockResolvedValue({ userId: 'user-1' });

      await profileService.updateNotificationSettings('user-1', {
        notifyBilling: true,
        someUnknownField: 'x',
        notifyCollaboration: 'not-a-boolean'
      });

      expect(prisma.userSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1', notifyBilling: true },
        update: { notifyBilling: true }
      });
    });

    it('allows toggling the master notificationsEnabled switch', async () => {
      prisma.userSettings.upsert.mockResolvedValue({ userId: 'user-1', notificationsEnabled: false });

      await profileService.updateNotificationSettings('user-1', { notificationsEnabled: false });

      expect(prisma.userSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1', notificationsEnabled: false },
        update: { notificationsEnabled: false }
      });
    });
  });
});
