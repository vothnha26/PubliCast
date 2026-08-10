const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const { qstashClient } = require('../../src/config/qstash');

jest.mock('../../src/repositories/social/social-account.repository', () => ({
  findDueForPostsSync: jest.fn()
}));

jest.mock('../../src/config/qstash', () => ({
  qstashClient: { publishJSON: jest.fn() }
}));

jest.mock('../../src/config/redis', () => ({}));

const mockAcquireLock = jest.fn();
const mockReleaseLock = jest.fn();
jest.mock('../../src/services/social/distributed-lock.service', () => {
  return jest.fn().mockImplementation(() => ({
    acquireLock: mockAcquireLock,
    releaseLock: mockReleaseLock
  }));
});

const postsSyncSchedulerService = require('../../src/services/social/posts-sync-scheduler.service');

const SYNCED_PLATFORMS = ['YOUTUBE', 'FACEBOOK', 'INSTAGRAM', 'THREADS', 'TIKTOK', 'BLUESKY'];

describe('PostsSyncSchedulerService', () => {
  afterEach(() => {
    postsSyncSchedulerService.stop();
    jest.clearAllMocks();
  });

  test('start() initializes a 15-minute cron job and stop() tears it down', () => {
    postsSyncSchedulerService.start();
    expect(postsSyncSchedulerService.job).not.toBeNull();

    postsSyncSchedulerService.stop();
    expect(postsSyncSchedulerService.job).toBeNull();
  });

  describe('queueDueAccounts', () => {
    it('scans every one of the 6 Smart-Fetch platforms', async () => {
      socialAccountRepository.findDueForPostsSync.mockResolvedValue([]);

      await postsSyncSchedulerService.queueDueAccounts();

      expect(socialAccountRepository.findDueForPostsSync).toHaveBeenCalledTimes(SYNCED_PLATFORMS.length);
      for (const platform of SYNCED_PLATFORMS) {
        expect(socialAccountRepository.findDueForPostsSync).toHaveBeenCalledWith(
          expect.any(Number),
          platform
        );
      }
    });

    it('publishes one QStash message per due account with the expected shape', async () => {
      socialAccountRepository.findDueForPostsSync.mockImplementation(async (_limit, platform) => {
        return platform === 'YOUTUBE'
          ? [{ id: 'acc-1', platform: 'YOUTUBE', brandId: 'brand-1' }]
          : [];
      });
      qstashClient.publishJSON.mockResolvedValue({});

      await postsSyncSchedulerService.queueDueAccounts();

      expect(qstashClient.publishJSON).toHaveBeenCalledTimes(1);
      expect(qstashClient.publishJSON).toHaveBeenCalledWith(expect.objectContaining({
        url: expect.stringContaining('/api/webhooks/qstash/posts-sync'),
        body: { socialAccountId: 'acc-1', platform: 'YOUTUBE', brandId: 'brand-1' },
        flowControl: { key: 'posts-sync-youtube', parallelism: 20 }
      }));
    });

    it('no-ops cleanly when zero accounts are due across all platforms', async () => {
      socialAccountRepository.findDueForPostsSync.mockResolvedValue([]);

      await postsSyncSchedulerService.queueDueAccounts();

      expect(qstashClient.publishJSON).not.toHaveBeenCalled();
    });

    it('continues queuing remaining accounts when one publish fails', async () => {
      socialAccountRepository.findDueForPostsSync.mockImplementation(async (_limit, platform) => {
        return platform === 'FACEBOOK'
          ? [
            { id: 'acc-1', platform: 'FACEBOOK', brandId: 'brand-1' },
            { id: 'acc-2', platform: 'FACEBOOK', brandId: 'brand-2' }
          ]
          : [];
      });
      qstashClient.publishJSON
        .mockRejectedValueOnce(new Error('qstash down'))
        .mockResolvedValueOnce({});

      await postsSyncSchedulerService.queueDueAccounts();

      expect(qstashClient.publishJSON).toHaveBeenCalledTimes(2);
    });
  });

  describe('runSyncWithLock', () => {
    it('skips queueDueAccounts when the lock is already held by another instance', async () => {
      mockAcquireLock.mockResolvedValue(null);
      socialAccountRepository.findDueForPostsSync.mockResolvedValue([]);

      await postsSyncSchedulerService.runSyncWithLock();

      expect(socialAccountRepository.findDueForPostsSync).not.toHaveBeenCalled();
      expect(mockReleaseLock).not.toHaveBeenCalled();
    });

    it('acquires the lock, scans, and releases the lock afterward', async () => {
      mockAcquireLock.mockResolvedValue('token-abc');
      socialAccountRepository.findDueForPostsSync.mockResolvedValue([]);

      await postsSyncSchedulerService.runSyncWithLock();

      expect(mockAcquireLock).toHaveBeenCalled();
      expect(socialAccountRepository.findDueForPostsSync).toHaveBeenCalled();
      expect(mockReleaseLock).toHaveBeenCalledWith(expect.any(String), 'token-abc');
    });

    it('still releases the lock when queueDueAccounts throws', async () => {
      mockAcquireLock.mockResolvedValue('token-abc');
      socialAccountRepository.findDueForPostsSync.mockRejectedValue(new Error('db down'));

      await expect(postsSyncSchedulerService.runSyncWithLock()).rejects.toThrow('db down');

      expect(mockReleaseLock).toHaveBeenCalledWith(expect.any(String), 'token-abc');
    });
  });
});
