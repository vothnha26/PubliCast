// @twurple/* is globally mocked in jest.setup.cjs (ESM-only builds Jest
// can't load).
const twitchGateway = require('../../src/services/social/twitch/twitch.gateway');
const twitchService = require('../../src/services/social/twitch/twitch.service');
const twitchController = require('../../src/controllers/social/twitch.controller');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const { PLATFORMS, POST_STATUS } = require('../../src/utils/constants');

jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/services/social/twitch/twitch.gateway');

describe('Twitch Integration Suite', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Twitch Service — getAuthUrl', () => {
    it('requests channel:manage:broadcast and channel:manage:schedule scopes', () => {
      const url = twitchService.getAuthUrl('brand_123', 'http://localhost/callback');
      expect(url).toContain('https://id.twitch.tv/oauth2/authorize');
      expect(url).toContain('scope=channel%3Amanage%3Abroadcast%20channel%3Amanage%3Aschedule');
      expect(url).toContain('state=brand_123');
    });
  });

  describe('Twitch Service — publishPost (Stream Schedule segment)', () => {
    const mockAccount = {
      id: 'acc-twitch-1',
      brandId: 'brand_123',
      platform: PLATFORMS.TWITCH,
      platformAccountId: 'broadcaster_1',
      accessToken: 'token',
      refreshToken: 'refresh'
    };

    beforeEach(() => {
      socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValue(mockAccount);
      twitchGateway.createAuthProvider.mockReturnValue({});
      twitchGateway.getApiClient.mockReturnValue({});
    });

    it('creates a schedule segment using the post title and scheduledAt', async () => {
      twitchGateway.createScheduleSegment.mockResolvedValue({
        id: 'segment-1',
        startDate: '2026-08-10T18:00:00.000Z'
      });

      const result = await twitchService.publishPost('brand_123', {
        title: 'Ranked grind tonight',
        scheduledAt: '2026-08-10T18:00:00.000Z'
      });

      expect(twitchGateway.createScheduleSegment).toHaveBeenCalledWith(
        expect.anything(),
        'broadcaster_1',
        { title: 'Ranked grind tonight', startDate: '2026-08-10T18:00:00.000Z' }
      );
      expect(result).toEqual({
        id: 'segment-1',
        status: POST_STATUS.PUBLISHED,
        publishedAt: '2026-08-10T18:00:00.000Z'
      });
    });

    it('falls back to caption when no title is given, truncated to 140 chars', async () => {
      twitchGateway.createScheduleSegment.mockResolvedValue({ id: 'segment-2', startDate: '2026-08-10T00:00:00.000Z' });

      const longCaption = 'x'.repeat(200);
      await twitchService.publishPost('brand_123', { caption: longCaption });

      const callArgs = twitchGateway.createScheduleSegment.mock.calls[0][2];
      expect(callArgs.title).toHaveLength(140);
    });

    it('rejects when neither title nor caption is provided', async () => {
      await expect(twitchService.publishPost('brand_123', {})).rejects.toThrow(
        'A title is required to schedule a Twitch broadcast'
      );
      expect(twitchGateway.createScheduleSegment).not.toHaveBeenCalled();
    });

    it('rejects when no Twitch account is connected', async () => {
      socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValueOnce(null);
      await expect(twitchService.publishPost('brand_123', { title: 'x' })).rejects.toThrow(
        'Twitch account not connected'
      );
    });
  });

  describe('Twitch Service — updatePublishedPost / deletePost', () => {
    const mockAccount = {
      id: 'acc-twitch-1',
      brandId: 'brand_123',
      platform: PLATFORMS.TWITCH,
      platformAccountId: 'broadcaster_1',
      accessToken: 'token',
      refreshToken: 'refresh'
    };

    beforeEach(() => {
      socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValue(mockAccount);
      twitchGateway.createAuthProvider.mockReturnValue({});
      twitchGateway.getApiClient.mockReturnValue({});
    });

    it('updates the schedule segment title and start time', async () => {
      twitchGateway.updateScheduleSegment.mockResolvedValue({ id: 'segment-1', startDate: '2026-08-11T18:00:00.000Z' });

      const result = await twitchService.updatePublishedPost('brand_123', 'segment-1', {
        title: 'New title',
        scheduledAt: '2026-08-11T18:00:00.000Z'
      });

      expect(twitchGateway.updateScheduleSegment).toHaveBeenCalledWith(
        expect.anything(),
        'broadcaster_1',
        'segment-1',
        { title: 'New title', startDate: '2026-08-11T18:00:00.000Z' }
      );
      expect(result.id).toBe('segment-1');
    });

    it('deletes the schedule segment', async () => {
      twitchGateway.deleteScheduleSegment.mockResolvedValue(undefined);

      const result = await twitchService.deletePost('brand_123', 'segment-1');

      expect(twitchGateway.deleteScheduleSegment).toHaveBeenCalledWith(expect.anything(), 'broadcaster_1', 'segment-1');
      expect(result).toEqual({ success: true });
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
