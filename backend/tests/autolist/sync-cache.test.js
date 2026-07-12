const createSyncCacheProxy = require('../../src/services/social/sync-cache.proxy');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const { ANALYTICS } = require('../../src/utils/constants');

jest.mock('../../src/repositories/social/social-account.repository');

describe('Social Sync Cache Proxy Tests', () => {
  let mockRealService;
  let cacheProxy;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock service to wrap
    mockRealService = {
      syncChannelMetrics: jest.fn().mockResolvedValue({ id: 'sa_1', mockSynced: true })
    };

    // Instantiate proxy
    cacheProxy = createSyncCacheProxy(mockRealService);
  });

  it('should call real service when lastSyncAt is empty (Cache Miss)', async () => {
    const mockAccount = {
      id: 'sa_1',
      platform: 'FACEBOOK',
      lastSyncAt: null
    };

    socialAccountRepository.findById.mockResolvedValue(mockAccount);

    const result = await cacheProxy.syncChannelMetrics('sa_1', '2026-05-20', '2026-05-25');

    expect(socialAccountRepository.findById).toHaveBeenCalledWith('sa_1');
    expect(mockRealService.syncChannelMetrics).toHaveBeenCalledWith('sa_1', '2026-05-20', '2026-05-25', false);
    expect(result).toEqual({ id: 'sa_1', mockSynced: true });
  });

  it('should serve cached data and not call real service when lastSyncAt is within cooldown window (Cache Hit)', async () => {
    const now = Date.now();
    // Cooldown check: set lastSyncAt to 1 minute ago to be safe regardless of cooldown configuration
    const lastSyncAt = new Date(now - 1 * 60 * 1000);

    const mockAccount = {
      id: 'sa_1',
      platform: 'FACEBOOK',
      lastSyncAt: lastSyncAt,
      analytics: [
        {
          dateFrom: new Date('2026-05-20T00:00:00.000Z'),
          dateTo: new Date('2026-05-25T00:00:00.000Z')
        }
      ]
    };

    socialAccountRepository.findById.mockResolvedValue(mockAccount);

    const result = await cacheProxy.syncChannelMetrics('sa_1', '2026-05-20', '2026-05-25');

    expect(socialAccountRepository.findById).toHaveBeenCalledWith('sa_1');
    expect(mockRealService.syncChannelMetrics).not.toHaveBeenCalled();
    expect(result).toEqual(mockAccount);
  });

  it('should call real service when lastSyncAt has expired beyond the cooldown period', async () => {
    const now = Date.now();
    const cooldownMs = ANALYTICS.COOLDOWN_HOURS * 60 * 60 * 1000;
    // Set lastSyncAt to 13 hours ago (exceeding 12h cooldown)
    const lastSyncAt = new Date(now - (cooldownMs + 1 * 60 * 60 * 1000));

    const mockAccount = {
      id: 'sa_1',
      platform: 'FACEBOOK',
      lastSyncAt: lastSyncAt
    };

    socialAccountRepository.findById.mockResolvedValue(mockAccount);

    const result = await cacheProxy.syncChannelMetrics('sa_1', '2026-05-20', '2026-05-25');

    expect(socialAccountRepository.findById).toHaveBeenCalledWith('sa_1');
    expect(mockRealService.syncChannelMetrics).toHaveBeenCalledWith('sa_1', '2026-05-20', '2026-05-25', false);
    expect(result).toEqual({ id: 'sa_1', mockSynced: true });
  });

  it('should call real service regardless of cooldown when force=true is passed', async () => {
    const now = Date.now();
    const lastSyncAt = new Date(now - 1 * 60 * 60 * 1000); // 1 hour ago (within cooldown)

    const mockAccount = {
      id: 'sa_1',
      platform: 'FACEBOOK',
      lastSyncAt: lastSyncAt
    };

    socialAccountRepository.findById.mockResolvedValue(mockAccount);

    const result = await cacheProxy.syncChannelMetrics('sa_1', '2026-05-20', '2026-05-25', true);

    expect(socialAccountRepository.findById).toHaveBeenCalledWith('sa_1');
    expect(mockRealService.syncChannelMetrics).toHaveBeenCalledWith('sa_1', '2026-05-20', '2026-05-25', true);
    expect(result).toEqual({ id: 'sa_1', mockSynced: true });
  });
});
