const youtubePublishService = require('../../src/services/social/youtube/youtube-publish.service');
const youtubeGateway = require('../../src/services/social/youtube/youtube.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const googleOAuthService = require('../../src/services/social/google-oauth.service');
const { YOUTUBE_VIDEO_POLLING } = require('../../src/services/social/youtube/youtube.constants');

jest.mock('../../src/services/social/youtube/youtube.gateway');
jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/services/social/google-oauth.service');

describe('YouTube Video Processing Status Polling Unit Tests (Issue #231)', () => {
  const mockBrandId = 'brand-yt-123';
  const mockAuth = { setCredentials: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    googleOAuthService.createClient.mockReturnValue(mockAuth);
    socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{
      id: 'acc-1',
      accessToken: 'valid-access-token',
      refreshToken: 'valid-refresh-token'
    }]);
  });

  describe('_pollProcessingStatus', () => {
    it('should return true immediately if processingStatus is succeeded', async () => {
      youtubeGateway.getVideosList.mockResolvedValueOnce({
        data: {
          items: [{
            id: 'v1',
            processingDetails: { processingStatus: 'succeeded' }
          }]
        }
      });

      const res = await youtubePublishService._pollProcessingStatus(mockAuth, 'v1');
      expect(res).toBe(true);
      expect(youtubeGateway.getVideosList).toHaveBeenCalledTimes(1);
    });

    it('should return true immediately if processingDetails is not present', async () => {
      youtubeGateway.getVideosList.mockResolvedValueOnce({
        data: { items: [{ id: 'v1' }] }
      });

      const res = await youtubePublishService._pollProcessingStatus(mockAuth, 'v1');
      expect(res).toBe(true);
    });

    it('should return true immediately if processingStatus is terminated', async () => {
      youtubeGateway.getVideosList.mockResolvedValueOnce({
        data: {
          items: [{
            id: 'v1-term',
            processingDetails: { processingStatus: 'terminated' }
          }]
        }
      });

      const res = await youtubePublishService._pollProcessingStatus(mockAuth, 'v1-term');
      expect(res).toBe(true);
      expect(youtubeGateway.getVideosList).toHaveBeenCalledTimes(1);
    });

    it('should retry when processingStatus is processing and succeed on second attempt', async () => {
      jest.spyOn(global, 'setTimeout').mockImplementation((fn) => fn());

      youtubeGateway.getVideosList
        .mockResolvedValueOnce({
          data: {
            items: [{ id: 'v2', processingDetails: { processingStatus: 'processing' } }]
          }
        })
        .mockResolvedValueOnce({
          data: {
            items: [{ id: 'v2', processingDetails: { processingStatus: 'succeeded' } }]
          }
        });

      const res = await youtubePublishService._pollProcessingStatus(mockAuth, 'v2');
      expect(res).toBe(true);
      expect(youtubeGateway.getVideosList).toHaveBeenCalledTimes(2);
    });

    it('should throw error when processingStatus is failed', async () => {
      youtubeGateway.getVideosList.mockResolvedValueOnce({
        data: {
          items: [{
            id: 'v3',
            processingDetails: {
              processingStatus: 'failed',
              processingFailureReason: 'other'
            }
          }]
        }
      });

      await expect(
        youtubePublishService._pollProcessingStatus(mockAuth, 'v3')
      ).rejects.toThrow('YouTube video processing failed: other');
    });

    it('should throw timeout error if video stays processing for maxAttempts', async () => {
      jest.spyOn(global, 'setTimeout').mockImplementation((fn) => fn());

      youtubeGateway.getVideosList.mockResolvedValue({
        data: {
          items: [{ id: 'v4', processingDetails: { processingStatus: 'processing' } }]
        }
      });

      await expect(
        youtubePublishService._pollProcessingStatus(mockAuth, 'v4')
      ).rejects.toThrow('YouTube video processing status poll timed out for ID: v4');

      expect(youtubeGateway.getVideosList).toHaveBeenCalledTimes(YOUTUBE_VIDEO_POLLING.MAX_ATTEMPTS);
    });
  });
});
