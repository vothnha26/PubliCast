const facebookGateway = require('../../src/services/social/facebook/facebook.gateway');
const facebookReelGateway = require('../../src/services/social/facebook/facebook-reel.gateway');

// Mock constants để poll nhanh trong test
jest.mock('../../src/config/facebook-reel.constants', () => {
  const original = jest.requireActual('../../src/config/facebook-reel.constants');
  return {
    ...original,
    VIDEO_STATUS_POLL_INTERVAL_MS: 1,
    VIDEO_STATUS_MAX_ATTEMPTS: 3
  };
});

describe('Facebook Video & Reel Processing Status Polling', () => {
  let originalFetch;
  let fetchMock;
  const pageId = 'page-123';
  const pageAccessToken = 'token-123';
  const videoId = 'video-999';

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = global.fetch;
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('_pollVideoStatus helper', () => {
    it('should poll until video_status is ready and resolve successfully', async () => {
      // 1st poll: processing
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: { video_status: 'processing' }
        })
      });
      // 2nd poll: ready
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: { video_status: 'ready' }
        })
      });

      const result = await facebookGateway._pollVideoStatus(videoId, pageAccessToken);
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should throw error if video_status is error with processing_phase message', async () => {
      // 1st poll: processing
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: { video_status: 'processing' }
        })
      });
      // 2nd poll: error
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: {
            video_status: 'error',
            processing_phase: {
              status: 'error',
              error: { message: 'Resolution too low' }
            }
          }
        })
      });

      await expect(
        facebookGateway._pollVideoStatus(videoId, pageAccessToken)
      ).rejects.toThrow('Facebook video processing failed: Resolution too low');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should throw timeout error if attempts exceed maxAttempts', async () => {
      // Poll returns processing indefinitely
      fetchMock.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: { video_status: 'processing' }
        })
      });

      await expect(
        facebookGateway._pollVideoStatus(videoId, pageAccessToken)
      ).rejects.toThrow('Facebook video processing timed out after 3 attempts');
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('publishReel integration with polling', () => {
    it('should poll video status after finish phase in publishReel', async () => {
      // Step 1: Start
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ video_id: videoId, upload_url: 'https://rupload.facebook.com/reel-upload' })
      });
      // Step 2: Upload
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      });
      // Step 3: Finish
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      });
      // Step 4: Status Poll -> ready
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: { video_status: 'ready' }
        })
      });

      const result = await facebookReelGateway.publishReel(
        pageId,
        pageAccessToken,
        'https://example.com/video.mp4',
        'Test Reel'
      );

      expect(result).toEqual({ id: videoId, success: true });
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });
  });
});
