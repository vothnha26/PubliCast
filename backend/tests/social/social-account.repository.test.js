/**
 * Test Suite: social-account.repository.js — Outbox integration
 *
 * Xác nhận upsertXxxAccount ghi socialAccount + outbox row SOCIAL_SYNC_ENQUEUE trong
 * CÙNG 1 prisma.$transaction, và payload outbox KHÔNG chứa token (chỉ socialAccountId).
 */
require('dotenv').config();

jest.mock('../../src/repositories/core/outbox-event.repository', () => ({
  create: jest.fn().mockResolvedValue({})
}));

jest.mock('../../src/config/prisma', () => {
  const mockSocialAccount = {
    upsert: jest.fn(),
    findUnique: jest.fn()
  };
  const mockAnalytics = { create: jest.fn() };
  const mockSocialAnalytics = { create: jest.fn() };

  const mockPrisma = {
    socialAccount: mockSocialAccount,
    analytics: mockAnalytics,
    socialAnalytics: mockSocialAnalytics,
    $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
    $queryRaw: jest.fn().mockResolvedValue([])
  };

  return mockPrisma;
});

const prisma = require('../../src/config/prisma');
const outboxEventRepository = require('../../src/repositories/core/outbox-event.repository');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const { OUTBOX_EVENT_TYPES } = require('../../src/constants/outbox.constants');
const { PLATFORMS } = require('../../src/utils/constants');

describe('SocialAccountRepository — outbox integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('upsertFacebookAccount', () => {
    it('writes the social account and a SOCIAL_SYNC_ENQUEUE outbox row inside the same transaction', async () => {
      const mockAccount = { id: 'sa-fb-1', platform: PLATFORMS.FACEBOOK, brandId: 'brand-1', accessToken: 'enc', refreshToken: 'enc' };
      prisma.socialAccount.upsert.mockResolvedValue(mockAccount);
      prisma.socialAccount.findUnique.mockResolvedValue(mockAccount);

      await socialAccountRepository.upsertFacebookAccount('brand-1', {
        pageId: 'page-123',
        username: 'mypage',
        displayName: 'My Page'
      }, { access_token: 'raw-token', refresh_token: 'raw-refresh' });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.socialAccount.upsert).toHaveBeenCalled();
      expect(outboxEventRepository.create).toHaveBeenCalledWith(
        OUTBOX_EVENT_TYPES.SOCIAL_SYNC_ENQUEUE,
        'sa-fb-1',
        { socialAccountId: 'sa-fb-1', platform: PLATFORMS.FACEBOOK, brandId: 'brand-1' },
        {},
        expect.anything()
      );
    });

    it('never writes the raw access/refresh token into the outbox payload', async () => {
      const mockAccount = { id: 'sa-fb-2', platform: PLATFORMS.FACEBOOK, brandId: 'brand-1' };
      prisma.socialAccount.upsert.mockResolvedValue(mockAccount);
      prisma.socialAccount.findUnique.mockResolvedValue(mockAccount);

      await socialAccountRepository.upsertFacebookAccount('brand-1', {
        pageId: 'page-999'
      }, { access_token: 'SUPER-SECRET-TOKEN', refresh_token: 'SUPER-SECRET-REFRESH' });

      const [, , payload] = outboxEventRepository.create.mock.calls[0];
      expect(JSON.stringify(payload)).not.toContain('SUPER-SECRET-TOKEN');
      expect(JSON.stringify(payload)).not.toContain('SUPER-SECRET-REFRESH');
      expect(Object.keys(payload)).toEqual(['socialAccountId', 'platform', 'brandId']);
    });

    it('saves analytics inside the same transaction when pageData.analytics is provided', async () => {
      const mockAccount = { id: 'sa-fb-3', platform: PLATFORMS.FACEBOOK, brandId: 'brand-1' };
      prisma.socialAccount.upsert.mockResolvedValue(mockAccount);
      prisma.socialAccount.findUnique.mockResolvedValue(mockAccount);
      prisma.analytics.create.mockResolvedValue({ id: 'analytics-1' });

      await socialAccountRepository.upsertFacebookAccount('brand-1', {
        pageId: 'page-1',
        analytics: { startDate: '2026-01-01', endDate: '2026-01-31', summary: {}, balance: [], interactions: {} }
      }, { access_token: 'tok' });

      expect(prisma.analytics.create).toHaveBeenCalled();
      expect(prisma.socialAnalytics.create).toHaveBeenCalled();
    });
  });

  describe('upsertInstagramAccount', () => {
    it('always writes PLATFORMS.INSTAGRAM into the outbox payload, never THREADS', async () => {
      const mockAccount = { id: 'sa-ig-1', platform: PLATFORMS.INSTAGRAM, brandId: 'brand-1' };
      prisma.socialAccount.upsert.mockResolvedValue(mockAccount);
      prisma.socialAccount.findUnique.mockResolvedValue(mockAccount);

      await socialAccountRepository.upsertInstagramAccount('brand-1', {
        igAccountId: 'ig-123'
      }, { access_token: 'tok' });

      expect(outboxEventRepository.create).toHaveBeenCalledWith(
        OUTBOX_EVENT_TYPES.SOCIAL_SYNC_ENQUEUE,
        'sa-ig-1',
        { socialAccountId: 'sa-ig-1', platform: PLATFORMS.INSTAGRAM, brandId: 'brand-1' },
        {},
        expect.anything()
      );
    });
  });

  describe('upsertThreadsAccount', () => {
    it('writes PLATFORMS.THREADS into both socialAccount and outbox payload, independent of Instagram', async () => {
      const mockAccount = { id: 'sa-threads-1', platform: PLATFORMS.THREADS, brandId: 'brand-1' };
      prisma.socialAccount.upsert.mockResolvedValue(mockAccount);
      prisma.socialAccount.findUnique.mockResolvedValue(mockAccount);

      await socialAccountRepository.upsertThreadsAccount('brand-1', {
        igAccountId: 'ig-123'
      }, { access_token: 'tok' });

      expect(prisma.socialAccount.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            brandId_platform_platformAccountId: expect.objectContaining({ platform: PLATFORMS.THREADS })
          }),
          create: expect.objectContaining({ platform: PLATFORMS.THREADS })
        })
      );
      expect(outboxEventRepository.create).toHaveBeenCalledWith(
        OUTBOX_EVENT_TYPES.SOCIAL_SYNC_ENQUEUE,
        'sa-threads-1',
        { socialAccountId: 'sa-threads-1', platform: PLATFORMS.THREADS, brandId: 'brand-1' },
        {},
        expect.anything()
      );
    });
  });

  describe('rollback behavior', () => {
    it('does not write an outbox row if the socialAccount upsert fails inside the transaction', async () => {
      prisma.socialAccount.upsert.mockRejectedValue(new Error('DB write failed'));

      await expect(
        socialAccountRepository.upsertFacebookAccount('brand-1', { pageId: 'page-x' }, { access_token: 'tok' })
      ).rejects.toThrow('DB write failed');

      expect(outboxEventRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('age-tiered sync cooldown (findDueForPostsSync/findDueForMetricsSync)', () => {
    beforeEach(() => {
      prisma.$queryRaw.mockResolvedValue([]);
    });

    it('_buildCooldownTierCase produces one WHEN per non-null tier plus an ELSE catch-all, matching ANALYTICS.SYNC_COOLDOWN_TIERS length', () => {
      const { ANALYTICS } = require('../../src/utils/constants');
      const ageExpr = { strings: ['age'], values: [] };
      const caseSql = socialAccountRepository._buildCooldownTierCase(ageExpr);

      // Prisma.sql produces a Sql instance whose .text/.sql reflects the
      // template — assert the tier count round-trips instead of pinning the
      // exact raw string, so this doesn't churn if Prisma's Sql internals change.
      const nonNullTiers = ANALYTICS.SYNC_COOLDOWN_TIERS.filter(t => t.maxAgeHours !== null);
      const whenCount = (caseSql.text.match(/WHEN/g) || []).length;
      expect(whenCount).toBe(nonNullTiers.length);
      expect(caseSql.text).toContain('ELSE');
      expect(caseSql.text).toContain('CASE');
    });

    it('findDueForMetricsSync queries via $queryRaw and returns its rows unchanged', async () => {
      const fakeRows = [{ id: 'sa-1', platform: PLATFORMS.YOUTUBE, brandId: 'brand-1' }];
      prisma.$queryRaw.mockResolvedValue(fakeRows);

      const result = await socialAccountRepository.findDueForMetricsSync(50);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(result).toBe(fakeRows);
    });

    it('findDueForPostsSync queries via $queryRaw and returns its rows unchanged', async () => {
      const fakeRows = [{ id: 'sa-2', platform: PLATFORMS.TIKTOK, brandId: 'brand-1' }];
      prisma.$queryRaw.mockResolvedValue(fakeRows);

      const result = await socialAccountRepository.findDueForPostsSync(50, PLATFORMS.TIKTOK);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(result).toBe(fakeRows);
    });

    it('findDueForPostsSync omits the platform filter when platform is not passed', async () => {
      await socialAccountRepository.findDueForPostsSync(50);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const [sqlParts] = prisma.$queryRaw.mock.calls[0];
      const fullText = Array.isArray(sqlParts) ? sqlParts.join('') : String(sqlParts);
      expect(fullText).not.toContain('sa.platform =');
    });
  });
});
