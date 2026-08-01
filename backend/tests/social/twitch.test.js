// @twurple/* is globally mocked in jest.setup.cjs (ESM-only builds Jest
// can't load).
const twitchGateway = require('../../src/services/social/twitch/twitch.gateway');
const twitchService = require('../../src/services/social/twitch/twitch.service');
const twitchChatService = require('../../src/services/social/twitch/twitch-chat.service');
const twitchClipService = require('../../src/services/social/twitch/twitch-clip.service');
const twitchController = require('../../src/controllers/social/twitch.controller');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');

jest.mock('../../src/repositories/social/social-account.repository');

describe('Twitch Integration Suite', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Twitch Service Unit Tests', () => {
    it('should throw error when calling publishPost because Twitch does not support scheduled posting', async () => {
      await expect(twitchService.publishPost()).rejects.toThrow(
        'Twitch does not support scheduled post publishing.'
      );
    });

    it('should generate Twitch auth URL with state and required scopes', () => {
      const url = twitchService.getAuthUrl('brand_123', 'http://localhost/callback');
      expect(url).toContain('https://id.twitch.tv/oauth2/authorize');
      expect(url).toContain('scope=channel%3Amanage%3Abroadcast%20clips%3Aedit%20chat%3Aread%20user%3Awrite%3Achat');
      expect(url).toContain('state=brand_123');
    });
  });

  describe('Twitch Gateway Tests', () => {
    it('should get stream status when live', async () => {
      const mockApiClient = {
        streams: {
          getStreamByUserId: jest.fn().mockResolvedValue({
            title: 'Valorant Stream',
            gameName: 'Valorant',
            viewerCount: 1500,
            startDate: new Date('2026-07-25T10:00:00Z')
          })
        }
      };

      const status = await twitchGateway.getStreamStatus(mockApiClient, 'broadcaster_1');
      expect(status.isLive).toBe(true);
      expect(status.title).toBe('Valorant Stream');
      expect(status.viewerCount).toBe(1500);
    });

    it('should return isLive false when stream is offline', async () => {
      const mockApiClient = {
        streams: {
          getStreamByUserId: jest.fn().mockResolvedValue(null)
        }
      };

      const status = await twitchGateway.getStreamStatus(mockApiClient, 'broadcaster_1');
      expect(status.isLive).toBe(false);
    });

    it('should poll clip details successfully when ready', async () => {
      const mockApiClient = {
        clips: {
          getClipById: jest.fn().mockResolvedValue({
            id: 'Clip123',
            url: 'https://clips.twitch.tv/Clip123',
            embedUrl: 'https://clips.twitch.tv/embed?clip=Clip123',
            title: 'Epic Quadra Kill',
            thumbnailUrl: 'https://clips-media-assets2.twitch.tv/Clip123-preview.jpg',
            duration: 30
          })
        }
      };

      const clip = await twitchGateway.pollClipDetails(mockApiClient, 'Clip123', 1);
      expect(clip.id).toBe('Clip123');
      expect(clip.title).toBe('Epic Quadra Kill');
    });
  });

  describe('Twitch Clip Service Tests', () => {
    it('should throw error STREAM_OFFLINE if stream is offline when creating clip', async () => {
      const mockApiClient = {
        streams: {
          getStreamByUserId: jest.fn().mockResolvedValue(null)
        }
      };

      await expect(
        twitchClipService.createAndPollClip(mockApiClient, 'broadcaster_1', 1)
      ).rejects.toThrow('Stream must be LIVE to create clips');
    });
  });

  describe('Twitch Chat Service Tests', () => {
    it('should register chat listener and emit socket messages', () => {
      const mockSocketServer = {
        to: jest.fn().mockReturnValue({
          emit: jest.fn()
        })
      };

      const mockApiClient = {};
      twitchChatService.startChatListener('broadcaster_1', mockApiClient, mockSocketServer);
      expect(twitchChatService.listeners.has('broadcaster_1')).toBe(true);

      twitchChatService.stopChatListener('broadcaster_1');
      expect(twitchChatService.listeners.has('broadcaster_1')).toBe(false);
    });
  });

  describe('Twitch Controller Endpoint Tests', () => {
    it('should return Twitch auth URL in controller', async () => {
      const req = {
        query: { brandId: 'brand_123', redirectUri: 'http://localhost/callback' }
      };
      const res = {
        json: jest.fn()
      };
      const next = jest.fn();

      await twitchController.getTwitchAuthUrl(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            url: expect.stringContaining('https://id.twitch.tv/oauth2/authorize')
          })
        })
      );
    });

    it('should handle disconnectTwitchAccount correctly', async () => {
      socialAccountRepository.deleteManyByBrandAndPlatform.mockResolvedValue({ count: 1 });

      const req = { body: { brandId: 'brand_123' } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await twitchController.disconnectTwitchAccount(req, res, next);
      expect(socialAccountRepository.deleteManyByBrandAndPlatform).toHaveBeenCalledWith('brand_123', 'TWITCH');
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Twitch account disconnected successfully'
      });
    });
  });
});
