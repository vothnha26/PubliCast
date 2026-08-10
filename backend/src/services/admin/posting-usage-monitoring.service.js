const postingUsageDailyRepository = require('../../repositories/workspace/posting-usage-daily.repository');

const NEAR_CAP_RATIO = 0.8;

/**
 * System-wide Fair Use monitoring for admins — aggregates the write-only
 * PostingUsageDaily log (see its own repository comment) into per-platform
 * stats: how many account-days hit or neared their daily cap this month.
 * Read-only; never used to decide whether to allow a publish.
 */
class PostingUsageMonitoringService {
  async getMonthlyOverview(year, month) {
    const rows = await postingUsageDailyRepository.findByMonth(year, month);

    const byPlatform = new Map();
    for (const row of rows) {
      if (!byPlatform.has(row.platform)) {
        byPlatform.set(row.platform, {
          platform: row.platform,
          accountDays: 0,
          atCapDays: 0,
          nearCapDays: 0,
          totalPublished: 0
        });
      }
      const bucket = byPlatform.get(row.platform);
      bucket.accountDays += 1;
      bucket.totalPublished += row.publishedCount;

      if (row.limitAtDate != null && row.limitAtDate > 0) {
        if (row.publishedCount >= row.limitAtDate) {
          bucket.atCapDays += 1;
        } else if (row.publishedCount >= row.limitAtDate * NEAR_CAP_RATIO) {
          bucket.nearCapDays += 1;
        }
      }
    }

    const platforms = Array.from(byPlatform.values()).map((bucket) => ({
      ...bucket,
      atCapRate: bucket.accountDays > 0 ? bucket.atCapDays / bucket.accountDays : 0,
      nearCapRate: bucket.accountDays > 0 ? bucket.nearCapDays / bucket.accountDays : 0
    }));

    return {
      year,
      month,
      totalAccountDays: rows.length,
      totalPublished: rows.reduce((sum, row) => sum + row.publishedCount, 0),
      platforms
    };
  }
}

module.exports = new PostingUsageMonitoringService();
