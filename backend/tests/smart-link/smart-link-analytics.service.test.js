const mockRedis = {
  set: jest.fn()
};
jest.mock('../../src/config/redis', () => mockRedis);

const smartLinkAnalyticsService = require('../../src/services/workspace/smart-link-analytics.service');
const smartLinkRepository = require('../../src/repositories/workspace/smart-link.repository');
const linkItemRepository = require('../../src/repositories/workspace/link-item.repository');

jest.mock('../../src/repositories/workspace/smart-link.repository', () => ({
  incrementTotalClicks: jest.fn(),
  incrementPageView: jest.fn(),
  upsertDailyPageView: jest.fn()
}));

jest.mock('../../src/repositories/workspace/link-item.repository', () => ({
  findById: jest.fn(),
  incrementClicks: jest.fn(),
  upsertDailyClick: jest.fn(),
  findDailyMetricsBySmartLink: jest.fn()
}));

describe('SmartLinkAnalyticsService Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('SL_UT_001 - trackLinkClick (Success with metric fallback)', () => {
    it('should increment clicks and still return the link when daily metric write fails', async () => {
      mockRedis.set.mockResolvedValue('OK'); // first click from this IP today
      const link = { id: 'link-1', smartLinkId: 'smart-1', clicks: 4 };
      linkItemRepository.findById.mockResolvedValue(link);
      linkItemRepository.incrementClicks.mockResolvedValue({ ...link, clicks: 5 });
      smartLinkRepository.incrementTotalClicks.mockResolvedValue({ id: 'smart-1' });
      linkItemRepository.upsertDailyClick.mockRejectedValue(new Error('metric store unavailable'));

      const result = await smartLinkAnalyticsService.trackLinkClick('link-1', '127.0.0.1', 'jest');

      expect(result.clicks).toBe(5);
      expect(linkItemRepository.findById).toHaveBeenCalledWith('link-1');
      expect(linkItemRepository.incrementClicks).toHaveBeenCalledWith('link-1');
      expect(smartLinkRepository.incrementTotalClicks).toHaveBeenCalledWith('smart-1');
      expect(linkItemRepository.upsertDailyClick).toHaveBeenCalledWith('link-1', 'smart-1', expect.any(Date));
    });
  });

  describe('SL_UT_002 - trackLinkClick (Missing link)', () => {
    it('should throw a 404 error when the link item does not exist', async () => {
      mockRedis.set.mockResolvedValue('OK');
      linkItemRepository.findById.mockResolvedValue(null);

      await expect(
        smartLinkAnalyticsService.trackLinkClick('missing-link', '127.0.0.1', 'jest')
      ).rejects.toMatchObject({
        message: 'Link Item not found',
        statusCode: 404
      });

      expect(linkItemRepository.incrementClicks).not.toHaveBeenCalled();
      expect(smartLinkRepository.incrementTotalClicks).not.toHaveBeenCalled();
      expect(linkItemRepository.upsertDailyClick).not.toHaveBeenCalled();
    });
  });

  describe('SL_UT_003 - trackPageView (real unique-visitor dedup)', () => {
    it('should count the visit as unique on the first hit from an IP today', async () => {
      mockRedis.set.mockResolvedValue('OK'); // Redis SET NX succeeded -> first time seen
      smartLinkRepository.incrementPageView.mockResolvedValue({});
      smartLinkRepository.upsertDailyPageView.mockResolvedValue({});

      await smartLinkAnalyticsService.trackPageView('smart-1', '1.2.3.4', 'jest');

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('smart-1'),
        '1',
        expect.objectContaining({ NX: true })
      );
      expect(smartLinkRepository.incrementPageView).toHaveBeenCalledWith('smart-1', true);
      expect(smartLinkRepository.upsertDailyPageView).toHaveBeenCalledWith('smart-1', expect.any(Date), true);
    });

    it('should not count the visit as unique on a repeat hit from the same IP today', async () => {
      mockRedis.set.mockResolvedValue(null); // Redis SET NX no-op -> key already existed
      smartLinkRepository.incrementPageView.mockResolvedValue({});
      smartLinkRepository.upsertDailyPageView.mockResolvedValue({});

      await smartLinkAnalyticsService.trackPageView('smart-1', '1.2.3.4', 'jest');

      expect(smartLinkRepository.incrementPageView).toHaveBeenCalledWith('smart-1', false);
      expect(smartLinkRepository.upsertDailyPageView).toHaveBeenCalledWith('smart-1', expect.any(Date), false);
    });

    it('should fail open (treat as unique) when Redis errors, instead of dropping the page view', async () => {
      mockRedis.set.mockRejectedValue(new Error('redis down'));
      smartLinkRepository.incrementPageView.mockResolvedValue({});
      smartLinkRepository.upsertDailyPageView.mockResolvedValue({});

      await smartLinkAnalyticsService.trackPageView('smart-1', '1.2.3.4', 'jest');

      expect(smartLinkRepository.incrementPageView).toHaveBeenCalledWith('smart-1', true);
    });
  });

  describe('SL_UT_004 - trackLinkClick (always increments clicks)', () => {
    it('should increment clicks and update total clicks on link click', async () => {
      const link = { id: 'link-1', smartLinkId: 'smart-1', clicks: 4 };
      linkItemRepository.findById.mockResolvedValue(link);
      linkItemRepository.incrementClicks.mockResolvedValue({ ...link, clicks: 5 });
      smartLinkRepository.incrementTotalClicks.mockResolvedValue({ id: 'smart-1' });
      linkItemRepository.upsertDailyClick.mockResolvedValue({});

      const result = await smartLinkAnalyticsService.trackLinkClick('link-1', '1.2.3.4', 'jest');

      expect(result.clicks).toBe(5);
      expect(linkItemRepository.incrementClicks).toHaveBeenCalledWith('link-1');
      expect(smartLinkRepository.incrementTotalClicks).toHaveBeenCalledWith('smart-1');
    });

    it('should fail open (still count the click) when Redis errors', async () => {
      mockRedis.set.mockRejectedValue(new Error('redis down'));
      const link = { id: 'link-1', smartLinkId: 'smart-1', clicks: 4 };
      linkItemRepository.findById.mockResolvedValue(link);
      linkItemRepository.incrementClicks.mockResolvedValue({ ...link, clicks: 5 });
      smartLinkRepository.incrementTotalClicks.mockResolvedValue({ id: 'smart-1' });
      linkItemRepository.upsertDailyClick.mockResolvedValue({});

      const result = await smartLinkAnalyticsService.trackLinkClick('link-1', '1.2.3.4', 'jest');

      expect(result.clicks).toBe(5);
      expect(linkItemRepository.incrementClicks).toHaveBeenCalledWith('link-1');
    });
  });
});
