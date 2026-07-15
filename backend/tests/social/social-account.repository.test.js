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
    $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma))
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

  describe('upsertInstagramAccount (also used by Threads with a custom platform param)', () => {
    it('writes the correct platform value into both socialAccount and outbox payload', async () => {
      const mockAccount = { id: 'sa-threads-1', platform: PLATFORMS.THREADS, brandId: 'brand-1' };
      prisma.socialAccount.upsert.mockResolvedValue(mockAccount);
      prisma.socialAccount.findUnique.mockResolvedValue(mockAccount);

      await socialAccountRepository.upsertInstagramAccount('brand-1', {
        igAccountId: 'ig-123'
      }, { access_token: 'tok' }, PLATFORMS.THREADS);

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
});
