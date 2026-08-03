const inboxSyncSchedulerService = require('../../src/services/social/inbox-sync-scheduler.service');
const prisma = require('../../src/config/prisma');
const inboxService = require('../../src/services/social/inbox.service');
const socialService = require('../../src/services/social/social.service');

describe('InboxSyncSchedulerService Unit Tests', () => {
  afterEach(() => {
    inboxSyncSchedulerService.stop();
    jest.restoreAllMocks();
  });

  test('start() initializes cron job with 15m schedule and stop() cleans it up', () => {
    inboxSyncSchedulerService.start();
    expect(inboxSyncSchedulerService.job).not.toBeNull();

    inboxSyncSchedulerService.stop();
    expect(inboxSyncSchedulerService.job).toBeNull();
  });

  test('syncAllActiveBrands() iterates connected platforms and triggers inbox sync', async () => {
    const mockBrands = [
      {
        id: 'brand-1',
        name: 'Brand One',
        socialAccounts: [{ platform: 'YOUTUBE' }, { platform: 'TIKTOK' }]
      }
    ];

    jest.spyOn(prisma.brand, 'findMany').mockResolvedValue(mockBrands);
    const syncSpy = jest.spyOn(inboxService, 'syncPlatformComments').mockResolvedValue([{ id: 'item-1' }]);
    jest.spyOn(socialService, 'getAggregatedMetrics').mockResolvedValue([]);

    await inboxSyncSchedulerService.syncAllActiveBrands();

    expect(prisma.brand.findMany).toHaveBeenCalled();
    expect(syncSpy).toHaveBeenCalledWith('brand-1', 'YOUTUBE');
    expect(syncSpy).toHaveBeenCalledWith('brand-1', 'TIKTOK');
  });

  test('syncAllActiveBrands() handles brands with no active social accounts safely', async () => {
    jest.spyOn(prisma.brand, 'findMany').mockResolvedValue([
      { id: 'brand-empty', name: 'Empty Brand', socialAccounts: [] }
    ]);
    const syncSpy = jest.spyOn(inboxService, 'syncPlatformComments');

    await inboxSyncSchedulerService.syncAllActiveBrands();

    expect(syncSpy).not.toHaveBeenCalled();
  });
});
