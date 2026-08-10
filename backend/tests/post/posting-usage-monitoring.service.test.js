jest.mock('../../src/repositories/workspace/posting-usage-daily.repository', () => ({
  findByMonth: jest.fn()
}));

const postingUsageDailyRepository = require('../../src/repositories/workspace/posting-usage-daily.repository');
const postingUsageMonitoringService = require('../../src/services/admin/posting-usage-monitoring.service');

describe('PostingUsageMonitoringService#getMonthlyOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aggregates account-days, totals, and at-cap/near-cap rates per platform', async () => {
    postingUsageDailyRepository.findByMonth.mockResolvedValue([
      { platform: 'FACEBOOK', publishedCount: 35, limitAtDate: 35 }, // at cap
      { platform: 'FACEBOOK', publishedCount: 30, limitAtDate: 35 }, // near cap (>= 80%)
      { platform: 'FACEBOOK', publishedCount: 5, limitAtDate: 35 },  // neither
      { platform: 'INSTAGRAM', publishedCount: 50, limitAtDate: 50 } // at cap
    ]);

    const result = await postingUsageMonitoringService.getMonthlyOverview(2026, 8);

    expect(result.year).toBe(2026);
    expect(result.month).toBe(8);
    expect(result.totalAccountDays).toBe(4);
    expect(result.totalPublished).toBe(35 + 30 + 5 + 50);

    const fb = result.platforms.find((p) => p.platform === 'FACEBOOK');
    expect(fb).toEqual(expect.objectContaining({
      accountDays: 3,
      atCapDays: 1,
      nearCapDays: 1,
      totalPublished: 70
    }));
    expect(fb.atCapRate).toBeCloseTo(1 / 3);
    expect(fb.nearCapRate).toBeCloseTo(1 / 3);

    const ig = result.platforms.find((p) => p.platform === 'INSTAGRAM');
    expect(ig).toEqual(expect.objectContaining({ accountDays: 1, atCapDays: 1, nearCapDays: 0 }));
  });

  it('returns an empty overview when no usage rows exist for the month', async () => {
    postingUsageDailyRepository.findByMonth.mockResolvedValue([]);

    const result = await postingUsageMonitoringService.getMonthlyOverview(2026, 8);

    expect(result.totalAccountDays).toBe(0);
    expect(result.totalPublished).toBe(0);
    expect(result.platforms).toEqual([]);
  });

  it('ignores rows with no limitAtDate (platform had no configured cap that day) for cap-rate purposes', async () => {
    postingUsageDailyRepository.findByMonth.mockResolvedValue([
      { platform: 'REDDIT', publishedCount: 10, limitAtDate: null }
    ]);

    const result = await postingUsageMonitoringService.getMonthlyOverview(2026, 8);

    const reddit = result.platforms.find((p) => p.platform === 'REDDIT');
    expect(reddit.atCapDays).toBe(0);
    expect(reddit.nearCapDays).toBe(0);
    expect(reddit.accountDays).toBe(1);
  });
});
