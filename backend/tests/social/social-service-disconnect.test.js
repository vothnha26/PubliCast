const socialService = require('../../src/services/social/social.service');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const youtubePubSubService = require('../../src/services/social/youtube/youtube-pubsub.service');
const notificationService = require('../../src/services/core/notification.service');

jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/services/social/youtube/youtube-pubsub.service');
jest.mock('../../src/services/core/notification.service');

describe('SocialService - disconnectAccount (PubSub Unsubscribe)', () => {
  const originalEnv = process.env.PUBLIC_WEBHOOK_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PUBLIC_WEBHOOK_URL = 'https://app.publicast.com';
    socialAccountRepository.findByBrandAndPlatformFirst = jest.fn().mockResolvedValue(null);
    socialAccountRepository.deleteManyByBrandAndPlatform.mockResolvedValue({ count: 1 });
    notificationService.create.mockResolvedValue({});
  });

  afterEach(() => {
    process.env.PUBLIC_WEBHOOK_URL = originalEnv;
  });

  it('should call youtubePubSubService.requestHubSubscription with UNSUBSCRIBE mode for YOUTUBE disconnect', async () => {
    socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValue({
      id: 'acc_123',
      platformAccountId: 'UC_channel_123'
    });
    youtubePubSubService.requestHubSubscription.mockResolvedValue({ success: true });

    await socialService.disconnectAccount('brand_123', 'YOUTUBE');

    expect(socialAccountRepository.findByBrandAndPlatformFirst).toHaveBeenCalledWith('brand_123', 'YOUTUBE');
    expect(youtubePubSubService.requestHubSubscription).toHaveBeenCalledWith(
      'UC_channel_123',
      'https://app.publicast.com/api/v1/social/youtube/pubsub/callback',
      'unsubscribe'
    );
    expect(socialAccountRepository.deleteManyByBrandAndPlatform).toHaveBeenCalledWith('brand_123', 'YOUTUBE');
  });

  it('should NOT call youtubePubSubService.requestHubSubscription for non-YouTube platforms', async () => {
    await socialService.disconnectAccount('brand_123', 'FACEBOOK');

    expect(socialAccountRepository.findByBrandAndPlatformFirst).not.toHaveBeenCalled();
    expect(youtubePubSubService.requestHubSubscription).not.toHaveBeenCalled();
    expect(socialAccountRepository.deleteManyByBrandAndPlatform).toHaveBeenCalledWith('brand_123', 'FACEBOOK');
  });

  it('should NOT call youtubePubSubService.requestHubSubscription for mock YouTube accounts', async () => {
    socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValue({
      id: 'acc_mock_123',
      platformAccountId: 'mock-channel-id',
      accessToken: 'mock-access-token'
    });

    await socialService.disconnectAccount('brand_123', 'YOUTUBE');

    expect(socialAccountRepository.findByBrandAndPlatformFirst).toHaveBeenCalledWith('brand_123', 'YOUTUBE');
    expect(youtubePubSubService.requestHubSubscription).not.toHaveBeenCalled();
    expect(socialAccountRepository.deleteManyByBrandAndPlatform).toHaveBeenCalledWith('brand_123', 'YOUTUBE');
  });

  it('should continue disconnect flow even if unsubscribe fails (best-effort)', async () => {
    socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValue({
      id: 'acc_123',
      platformAccountId: 'UC_channel_123'
    });
    youtubePubSubService.requestHubSubscription.mockRejectedValue(new Error('Google Hub Timeout'));

    const result = await socialService.disconnectAccount('brand_123', 'YOUTUBE');

    expect(youtubePubSubService.requestHubSubscription).toHaveBeenCalled();
    expect(socialAccountRepository.deleteManyByBrandAndPlatform).toHaveBeenCalledWith('brand_123', 'YOUTUBE');
    expect(result).toEqual({ count: 1 });
  });
});
