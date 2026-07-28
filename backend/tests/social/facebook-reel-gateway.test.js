const { FacebookReelGateway } = require('../../src/services/social/facebook/facebook-reel.gateway');
const { FacebookRateLimitError } = require('../../src/services/social/facebook/facebook-reel.gateway');
const fs = require('fs');

jest.mock('fs');

describe('FacebookReelGateway Tests', () => {
  let gateway;
  let originalFetch;
  const mockFacebookGateway = {
    graphBaseUrl: 'https://graph.facebook.com/v18.0',
    _pollVideoStatus: jest.fn().mockResolvedValue(true)
  };

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    gateway = new FacebookReelGateway(mockFacebookGateway);
  });

  describe('publishReel', () => {
    it('should successfully publish a reel via 3-phase upload with hosted URL', async () => {
      // Phase 1: Start
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          video_id: 'video_123',
          upload_url: 'https://upload.facebook.com/video_123'
        })
      });
      // Phase 2: Upload
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      });
      // Phase 3: Finish
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true, id: 'video_123' })
      });

      const result = await gateway.publishReel(
        'page_123',
        'token_123',
        'https://example.com/video.mp4',
        'My First Reel',
        { placeId: 'place_999' }
      );

      expect(result).toEqual({ id: 'video_123', success: true });
      expect(global.fetch).toHaveBeenCalledTimes(3);

      // Verify phase 1 URL and options
      expect(global.fetch).toHaveBeenNthCalledWith(1,
        'https://graph.facebook.com/v18.0/page_123/video_reels',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should successfully publish a reel via 3-phase upload with local file', async () => {
      fs.statSync.mockReturnValue({ size: 1024 });
      fs.readFileSync.mockReturnValue(Buffer.from('video contents'));

      // Phase 1: Start
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          video_id: 'video_123',
          upload_url: 'https://upload.facebook.com/video_123'
        })
      });
      // Phase 2: Upload
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      });
      // Phase 3: Finish
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true, id: 'video_123' })
      });

      const result = await gateway.publishReel(
        'page_123',
        'token_123',
        'C:\\videos\\reel.mp4',
        'Local Reel'
      );

      expect(result).toEqual({ id: 'video_123', success: true });
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw FacebookRateLimitError on 429 response during initialization and parse rateLimitInfo from header', async () => {
      const mockHeaders = new Map();
      mockHeaders.set('retry-after', '45');
      mockHeaders.set('x-app-usage', '{"call_count":100}');

      global.fetch.mockResolvedValueOnce({
        ok: false,
        headers: mockHeaders,
        json: jest.fn().mockResolvedValue({
          error: {
            message: 'Calls to this api have exceeded the rate limit',
            code: 4,
            error_subcode: 80007
          }
        })
      });

      try {
        await gateway.publishReel(
          'page_123',
          'token_123',
          'https://example.com/video.mp4',
          'Rate Limited'
        );
        throw new Error('Expected to throw FacebookRateLimitError');
      } catch (err) {
        expect(err).toBeInstanceOf(FacebookRateLimitError);
        expect(err.retryAfterSeconds).toBe(45);
        expect(err.rateLimitInfo).toEqual({ call_count: 100 });
      }
    });
  });

  describe('uploadReelThumbnail', () => {
    it('should upload custom thumbnail successfully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      });

      const thumbnailBuffer = Buffer.from('mock thumbnail image');
      const result = await gateway.uploadReelThumbnail('video_123', 'token_123', thumbnailBuffer);

      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/video_123/thumbnails',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      );
    });
  });

  describe('inviteReelCollaborator', () => {
    it('should invite collaborator successfully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      });

      const result = await gateway.inviteReelCollaborator('video_123', 'collab_999', 'token_123');

      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/video_123/collaborators?target_id=collab_999&access_token=token_123',
        { method: 'POST' }
      );
    });
  });

  describe('checkReelCopyrightStatus', () => {
    it('should query copyright check information', async () => {
      const mockCopyrightResponse = {
        copyright_check_information: {
          status: { status: 'complete', matches_found: false }
        }
      };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockCopyrightResponse)
      });

      const result = await gateway.checkReelCopyrightStatus('video_123', 'token_123');

      expect(result).toEqual(mockCopyrightResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/video_123?fields=copyright_check_information&access_token=token_123',
        { method: 'GET' }
      );
    });
  });

  describe('getReelVideoInsights', () => {
    it('should get video insights metrics', async () => {
      const mockInsightsResponse = {
        data: [
          { name: 'blue_reels_play_count', values: [{ value: 5000 }] }
        ]
      };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockInsightsResponse)
      });

      const result = await gateway.getReelVideoInsights('video_123', 'token_123');

      expect(result).toEqual(mockInsightsResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/video_123/video_insights?metric=blue_reels_play_count,fb_reels_replay_count&access_token=token_123',
        { method: 'GET' }
      );
    });
  });
});
