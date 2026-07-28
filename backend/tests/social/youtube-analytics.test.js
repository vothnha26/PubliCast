const youtubeAnalytics = require('../../src/services/social/youtube/youtube-analytics.service');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const { PLATFORMS } = require('../../src/utils/constants');

jest.mock('../../src/repositories/social/social-account.repository');

describe('YoutubeAnalyticsService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncChannelMetrics', () => {
    it('should throw error if account is not found', async () => {
      socialAccountRepository.findById.mockResolvedValue(null);

      await expect(
        youtubeAnalytics.syncChannelMetrics('invalid-id', '2026-06-01', '2026-06-07')
      ).rejects.toThrow('Social account not found or is not a YouTube account');
      
      expect(socialAccountRepository.findById).toHaveBeenCalledWith('invalid-id');
    });

    it('should throw error if account is not a YouTube account', async () => {
      const nonYtAccount = { id: 'sa-fb', platform: PLATFORMS.FACEBOOK };
      socialAccountRepository.findById.mockResolvedValue(nonYtAccount);

      await expect(
        youtubeAnalytics.syncChannelMetrics('sa-fb', '2026-06-01', '2026-06-07')
      ).rejects.toThrow('Social account not found or is not a YouTube account');
    });

    it('should bypass sync and return account directly if accessToken starts with mock-', async () => {
      const mockYtAccount = {
        id: 'sa-mock-yt',
        platform: PLATFORMS.YOUTUBE,
        accessToken: 'mock-selenium-access-token-123',
        brandId: 'brand-123'
      };
      socialAccountRepository.findById.mockResolvedValue(mockYtAccount);

      const spyCreateClient = jest.spyOn(youtubeAnalytics, '_createAuthenticatedClient');
      const spyGetChannelInfo = jest.spyOn(youtubeAnalytics, 'getChannelInfo');

      const result = await youtubeAnalytics.syncChannelMetrics('sa-mock-yt', '2026-06-21', '2026-06-27');

      expect(result).toEqual(mockYtAccount);
      expect(spyCreateClient).not.toHaveBeenCalled();
      expect(spyGetChannelInfo).not.toHaveBeenCalled();

      spyCreateClient.mockRestore();
      spyGetChannelInfo.mockRestore();
    });

    it('should call getChannelInfo and upsert account if accessToken is valid (not mock)', async () => {
      const realYtAccount = {
        id: 'sa-real-yt',
        platform: PLATFORMS.YOUTUBE,
        accessToken: 'ya29.valid-oauth-token-here',
        brandId: 'brand-123'
      };
      socialAccountRepository.findById.mockResolvedValue(realYtAccount);

      const mockClient = { credentials: { access_token: 'new-access', refresh_token: 'new-refresh', expiry_date: 123456 } };
      const spyCreateClient = jest.spyOn(youtubeAnalytics, '_createAuthenticatedClient').mockReturnValue(mockClient);

      const mockChannelData = { channelId: 'yt-chan-123', snippet: {}, statistics: {} };
      const spyGetChannelInfo = jest.spyOn(youtubeAnalytics, 'getChannelInfo').mockResolvedValue(mockChannelData);

      socialAccountRepository.upsertYouTubeAccount.mockResolvedValue({ id: 'sa-real-yt', updated: true });

      const result = await youtubeAnalytics.syncChannelMetrics('sa-real-yt', '2026-06-21', '2026-06-27');

      expect(spyCreateClient).toHaveBeenCalledWith(realYtAccount);
      expect(spyGetChannelInfo).toHaveBeenCalledWith(mockClient, '2026-06-21', '2026-06-27', realYtAccount);
      expect(socialAccountRepository.upsertYouTubeAccount).toHaveBeenCalledWith(
        'brand-123',
        mockChannelData,
        {
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expiry_date: 123456
        },
        // enqueueSync: false — syncChannelMetrics IS the sync job; it must not
        // re-enqueue another one via the outbox or it loops forever.
        { enqueueSync: false }
      );
      expect(result).toEqual({ id: 'sa-real-yt', updated: true });

      spyCreateClient.mockRestore();
      spyGetChannelInfo.mockRestore();
    });
  });

  describe('getChannelInfo - Structured Error Parsing', () => {
    it('should propagate auth error when error object has status = 401 without specific text', async () => {
      const mockAuth = { credentials: { access_token: 'ya29.expired-token' } };
      const structured401Error = new Error('API Request Failed');
      structured401Error.response = {
        status: 401,
        data: {
          error: {
            code: 401,
            errors: [{ reason: 'authError', message: 'Invalid Credentials' }]
          }
        }
      };

      const youtubeGateway = require('../../src/services/social/youtube/youtube.gateway');
      jest.spyOn(youtubeGateway, 'getChannelList').mockRejectedValue(structured401Error);

      await expect(
        youtubeAnalytics.getChannelInfo(mockAuth, '2026-06-01', '2026-06-07', { id: 'sa-123' })
      ).rejects.toThrow('API Request Failed');

      youtubeGateway.getChannelList.mockRestore();
    });
  });
});
