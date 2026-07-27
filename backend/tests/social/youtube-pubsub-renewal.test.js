const youtubePubSubRenewalService = require('../../src/services/social/youtube/youtube-pubsub-renewal.service');
const youtubePubSubService = require('../../src/services/social/youtube/youtube-pubsub.service');
const prisma = require('../../src/config/prisma');
const logger = require('../../src/utils/logger');
const { YOUTUBE_PUBSUB } = require('../../src/services/social/youtube/youtube.constants');

// Mock Prisma
jest.mock('../../src/config/prisma', () => ({
  youTubeSubscription: {
    findMany: jest.fn()
  }
}));

// Mock YoutubePubSubService
jest.mock('../../src/services/social/youtube/youtube-pubsub.service', () => ({
  requestHubSubscription: jest.fn()
}));

// Mock Logger
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('YoutubePubSubRenewalService Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
  });

  describe('startScheduler and stopScheduler', () => {
    it('should setup timeout and interval on startScheduler', () => {
      const spyTimeout = jest.spyOn(global, 'setTimeout');
      const spyInterval = jest.spyOn(global, 'setInterval');

      youtubePubSubRenewalService.startScheduler();

      expect(spyTimeout).toHaveBeenCalledWith(expect.any(Function), YOUTUBE_PUBSUB.RENEWAL_STARTUP_DELAY_MS);
      expect(spyInterval).toHaveBeenCalledWith(expect.any(Function), YOUTUBE_PUBSUB.RENEWAL_CHECK_INTERVAL_MS);

      youtubePubSubRenewalService.stopScheduler();
    });

    it('should not setup duplicate timers if startScheduler is called twice', () => {
      const spyTimeout = jest.spyOn(global, 'setTimeout');
      const spyInterval = jest.spyOn(global, 'setInterval');

      youtubePubSubRenewalService.startScheduler();
      youtubePubSubRenewalService.startScheduler();

      expect(spyTimeout).toHaveBeenCalledTimes(1);
      expect(spyInterval).toHaveBeenCalledTimes(1);

      youtubePubSubRenewalService.stopScheduler();
    });

    it('should clear timers on stopScheduler', () => {
      const spyClearTimeout = jest.spyOn(global, 'clearTimeout');
      const spyClearInterval = jest.spyOn(global, 'clearInterval');

      youtubePubSubRenewalService.startScheduler();
      youtubePubSubRenewalService.stopScheduler();

      expect(spyClearTimeout).toHaveBeenCalled();
      expect(spyClearInterval).toHaveBeenCalled();
    });
  });

  describe('renewExpiringSoon', () => {
    it('should skip renewal check if PUBLIC_WEBHOOK_URL is not set', async () => {
      delete process.env.PUBLIC_WEBHOOK_URL;

      await youtubePubSubRenewalService.renewExpiringSoon();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('PUBLIC_WEBHOOK_URL is not configured'));
      expect(prisma.youTubeSubscription.findMany).not.toHaveBeenCalled();
    });

    it('should do nothing if no subscriptions are expiring soon', async () => {
      process.env.PUBLIC_WEBHOOK_URL = 'https://mywebhook.com';
      prisma.youTubeSubscription.findMany.mockResolvedValue([]);

      await youtubePubSubRenewalService.renewExpiringSoon();

      expect(prisma.youTubeSubscription.findMany).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('No expiring subscriptions found'));
      expect(youtubePubSubService.requestHubSubscription).not.toHaveBeenCalled();
    });

    it('should request renewal for all expiring subscriptions', async () => {
      process.env.PUBLIC_WEBHOOK_URL = 'https://mywebhook.com';
      const mockSubs = [
        { channelId: 'UC111', expiresAt: new Date() },
        { channelId: 'UC222', expiresAt: new Date() }
      ];
      prisma.youTubeSubscription.findMany.mockResolvedValue(mockSubs);
      youtubePubSubService.requestHubSubscription.mockResolvedValue({ success: true });

      await youtubePubSubRenewalService.renewExpiringSoon();

      expect(prisma.youTubeSubscription.findMany).toHaveBeenCalled();
      expect(youtubePubSubService.requestHubSubscription).toHaveBeenCalledTimes(2);
      expect(youtubePubSubService.requestHubSubscription).toHaveBeenNthCalledWith(
        1,
        'UC111',
        'https://mywebhook.com/api/v1/social/youtube/pubsub/callback',
        YOUTUBE_PUBSUB.MODE.SUBSCRIBE
      );
      expect(youtubePubSubService.requestHubSubscription).toHaveBeenNthCalledWith(
        2,
        'UC222',
        'https://mywebhook.com/api/v1/social/youtube/pubsub/callback',
        YOUTUBE_PUBSUB.MODE.SUBSCRIBE
      );
    });

    it('should handle failures gracefully and continue processing other channels', async () => {
      process.env.PUBLIC_WEBHOOK_URL = 'https://mywebhook.com';
      const mockSubs = [
        { channelId: 'UC_FAIL', expiresAt: new Date() },
        { channelId: 'UC_SUCCESS', expiresAt: new Date() }
      ];
      prisma.youTubeSubscription.findMany.mockResolvedValue(mockSubs);

      youtubePubSubService.requestHubSubscription
        .mockRejectedValueOnce(new Error('Google Hub Timeout'))
        .mockResolvedValueOnce({ success: true });

      await youtubePubSubRenewalService.renewExpiringSoon();

      expect(youtubePubSubService.requestHubSubscription).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to renew subscription for channel UC_FAIL: Google Hub Timeout'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Renewal request accepted by Google Hub for channel: UC_SUCCESS'));
    });

    it('should log an error if Google Hub rejects subscription request (success: false)', async () => {
      process.env.PUBLIC_WEBHOOK_URL = 'https://mywebhook.com';
      const mockSubs = [
        { channelId: 'UC_REJECT', expiresAt: new Date() }
      ];
      prisma.youTubeSubscription.findMany.mockResolvedValue(mockSubs);
      youtubePubSubService.requestHubSubscription.mockResolvedValue({ success: false, error: 'Invalid Callback' });

      await youtubePubSubRenewalService.renewExpiringSoon();

      expect(youtubePubSubService.requestHubSubscription).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Google Hub rejected renewal for channel UC_REJECT: Invalid Callback'));
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('Renewal request accepted by Google Hub'));
    });
  });
});
