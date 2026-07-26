const blueskyService = require('../../src/services/social/bluesky/bluesky.service');
const blueskyGateway = require('../../src/services/social/bluesky/bluesky.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const QuotaTrackerService = require('../../src/services/social/quota-tracker.service');
const { PLATFORMS, QUOTA_TTL_STRATEGY } = require('../../src/utils/constants');
const BLUESKY_CONSTANTS = require('../../src/services/social/bluesky/bluesky.constants');

jest.mock('../../src/services/social/bluesky/bluesky.gateway');
jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/services/social/quota-tracker.service');
jest.mock('../../src/utils/encryption', () => ({
  decrypt: jest.fn(val => val || 'decrypted_token'),
  encrypt: jest.fn(val => val)
}));

describe('BlueskyExtendedService (Video, Quota Rate-Limit, Social Actions)', () => {
  const mockBrandId = 'brand-bsky-123';
  const mockAccountId = 'acc-bsky-456';
  const mockAccount = {
    id: mockAccountId,
    platform: PLATFORMS.BLUESKY,
    platformAccountId: 'did:plc:testuser123',
    username: 'test.bsky.social',
    accessToken: 'encrypted_access_token',
    refreshToken: 'encrypted_refresh_token',
    blueskyAccount: {
      did: 'did:plc:testuser123',
      handle: 'test.bsky.social',
      pdsUrl: 'https://bsky.social',
      emailConfirmed: true
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValue(mockAccount);
    blueskyGateway.createAgent.mockReturnValue({});
    blueskyGateway.resumeSession.mockResolvedValue(true);
    jest.spyOn(blueskyService.quotaTracker, 'getSummary').mockResolvedValue({ totalUsed: 0 });
    jest.spyOn(blueskyService.quotaTracker, 'incrementAndGet').mockResolvedValue(3);
    jest.spyOn(blueskyService.quotaTracker, 'incrementAndGetHourly').mockResolvedValue(3);
  });

  describe('Phần A — Video Upload', () => {
    it('sẽ ném lỗi nếu tài khoản chưa xác nhận email khi tải video', async () => {
      socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValueOnce({
        ...mockAccount,
        blueskyAccount: { ...mockAccount.blueskyAccount, emailConfirmed: false }
      });

      await expect(
        blueskyService.publishPost(mockBrandId, {
          caption: 'Test video',
          video: { buffer: Buffer.from('fake-video'), mimeType: 'video/mp4' }
        })
      ).rejects.toThrow('Tài khoản Bluesky chưa xác thực Email. Bluesky yêu cầu xác thực Email tại bsky.app > Settings > Confirm Email trước khi cho phép tải Video.');
    });

    it('sẽ tự đồng bộ lại emailConfirmed từ getSession() nếu DB đang lưu giá trị cũ (chưa xác thực) nhưng thực tế đã xác thực', async () => {
      const staleAccount = {
        ...mockAccount,
        blueskyAccount: { ...mockAccount.blueskyAccount, emailConfirmed: false }
      };
      socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValueOnce(staleAccount);
      blueskyGateway.getSession.mockResolvedValue({ emailConfirmed: true });
      blueskyGateway.publishPost.mockResolvedValue({ id: 'at://post/after-verify' });

      const res = await blueskyService.publishPost(mockBrandId, {
        caption: 'Video after verifying email',
        video: { buffer: Buffer.from('video-data'), mimeType: 'video/mp4' }
      });

      expect(blueskyGateway.getSession).toHaveBeenCalled();
      expect(socialAccountRepository.updateBlueskyMetrics).toHaveBeenCalledWith(
        mockAccountId,
        { emailConfirmed: true }
      );
      expect(res).toEqual({ id: 'at://post/after-verify' });
    });

    it('sẽ gọi blueskyGateway.publishPost với đối tượng video khi tài khoản hợp lệ', async () => {
      const mockAgent = {};
      blueskyGateway.createAgent.mockReturnValue(mockAgent);
      blueskyGateway.publishPost.mockResolvedValue({ id: 'at://did:plc:testuser123/app.bsky.feed.post/3k1234' });

      const res = await blueskyService.publishPost(mockBrandId, {
        caption: 'Hi Bluesky Video',
        video: { buffer: Buffer.from('video-data'), mimeType: 'video/mp4' }
      });

      expect(res).toEqual({ id: 'at://did:plc:testuser123/app.bsky.feed.post/3k1234' });
      expect(blueskyGateway.publishPost).toHaveBeenCalledWith(mockAgent, {
        text: 'Hi Bluesky Video',
        images: [],
        video: { buffer: Buffer.from('video-data'), mimeType: 'video/mp4' },
        replyTo: null
      });
    });
  });

  describe('Phần B — Rate Limiting Quota & Session Resume', () => {
    it('sẽ khôi phục phiên session qua agent.resumeSession trước khi gọi API có auth', async () => {
      const mockAgent = {};
      blueskyGateway.createAgent.mockReturnValue(mockAgent);
      blueskyGateway.publishPost.mockResolvedValue({ id: 'at://post/resumed' });

      await blueskyService.publishPost(mockBrandId, { caption: 'Post with resume session' });

      expect(blueskyGateway.resumeSession).toHaveBeenCalledWith(mockAgent, {
        accessJwt: 'encrypted_access_token',
        refreshJwt: 'encrypted_refresh_token',
        did: 'did:plc:testuser123',
        handle: 'test.bsky.social'
      });
    });

    it('sẽ ném lỗi nếu số điểm quota theo giờ vượt ngưỡng HOURLY_LIMIT (5000)', async () => {
      jest.spyOn(blueskyService.quotaTracker, 'incrementAndGetHourly').mockResolvedValueOnce(
        QUOTA_TTL_STRATEGY.BLUESKY.HOURLY_LIMIT + 1
      );

      await expect(
        blueskyService.publishPost(mockBrandId, { caption: 'Over quota post' })
      ).rejects.toThrow(/Bluesky hourly rate limit exceeded/);
    });

    it('sẽ ném lỗi nếu số điểm quota theo ngày vượt ngưỡng DAILY_LIMIT (35000)', async () => {
      jest.spyOn(blueskyService.quotaTracker, 'incrementAndGet').mockResolvedValueOnce(
        QUOTA_TTL_STRATEGY.BLUESKY.DAILY_LIMIT + 1
      );

      await expect(
        blueskyService.publishPost(mockBrandId, { caption: 'Over daily quota post' })
      ).rejects.toThrow(/Bluesky daily rate limit exceeded/);
    });

    it('sẽ tăng quota bằng điểm CREATE (3 điểm) khi đăng bài thành công', async () => {
      const mockAgent = {};
      blueskyGateway.createAgent.mockReturnValue(mockAgent);
      blueskyGateway.publishPost.mockResolvedValue({ id: 'at://did:plc:123/post/1' });

      await blueskyService.publishPost(mockBrandId, { caption: 'Valid post' });

      expect(blueskyService.quotaTracker.incrementAndGetHourly).toHaveBeenCalledWith(
        `bluesky:${mockAccountId}`,
        QUOTA_TTL_STRATEGY.BLUESKY.POINTS.CREATE,
        3600
      );
      expect(blueskyService.quotaTracker.incrementAndGet).toHaveBeenCalledWith(
        `bluesky:${mockAccountId}`,
        QUOTA_TTL_STRATEGY.BLUESKY.POINTS.CREATE
      );
    });

    it('sẽ tạo key getHourlyQuotaKey chính xác chuẩn giờ Pacific Time (PT) độc lập với múi giờ máy chủ', () => {
      const ActualQuotaTrackerService = jest.requireActual('../../src/services/social/quota-tracker.service');
      const realQuotaTracker = new ActualQuotaTrackerService();
      const fixedDate = new Date('2026-07-26T14:30:00Z'); // 14:30 UTC -> 07:30 PDT (PT)
      const key = realQuotaTracker.getHourlyQuotaKey('test-acc', fixedDate);
      expect(key).toBe('quota:hourly:test-acc:2026-07-26_07');
    });
  });

  describe('Phần C — Social Actions', () => {
    it('sẽ gọi likePost thông qua gateway và tính điểm UPDATE (2 điểm)', async () => {
      const mockAgent = {};
      blueskyGateway.createAgent.mockReturnValue(mockAgent);
      blueskyGateway.likePost.mockResolvedValue({ uri: 'at://like/1' });

      const res = await blueskyService.likePost(mockBrandId, { uri: 'at://post/1', cid: 'bafk1' });

      expect(res).toEqual({ uri: 'at://like/1' });
      expect(blueskyService.quotaTracker.incrementAndGet).toHaveBeenCalledWith(
        `bluesky:${mockAccountId}`,
        QUOTA_TTL_STRATEGY.BLUESKY.POINTS.UPDATE
      );
    });

    it('sẽ gọi deleteLike thông qua gateway và tính điểm DELETE (1 điểm)', async () => {
      const mockAgent = {};
      blueskyGateway.createAgent.mockReturnValue(mockAgent);
      blueskyGateway.deleteLike.mockResolvedValue(true);

      const res = await blueskyService.deleteLike(mockBrandId, { likeUri: 'at://like/1' });

      expect(res).toBe(true);
      expect(blueskyService.quotaTracker.incrementAndGet).toHaveBeenCalledWith(
        `bluesky:${mockAccountId}`,
        QUOTA_TTL_STRATEGY.BLUESKY.POINTS.DELETE
      );
    });

    it('sẽ tạo reply comment đúng định dạng replyTo trong publishPost', async () => {
      const mockAgent = {};
      blueskyGateway.createAgent.mockReturnValue(mockAgent);
      blueskyGateway.publishPost.mockResolvedValue({ id: 'at://reply/1' });

      await blueskyService.replyToComment(mockBrandId, {
        text: 'Cảm ơn bạn!',
        parentUri: 'at://post/parent',
        parentCid: 'cidParent',
        rootUri: 'at://post/root',
        rootCid: 'cidRoot'
      });

      expect(blueskyGateway.publishPost).toHaveBeenCalledWith(mockAgent, {
        text: 'Cảm ơn bạn!',
        images: [],
        video: null,
        replyTo: {
          root: { uri: 'at://post/root', cid: 'cidRoot' },
          parent: { uri: 'at://post/parent', cid: 'cidParent' }
        }
      });
    });
  });
});
