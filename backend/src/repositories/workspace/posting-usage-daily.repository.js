const prisma = require('../../config/prisma');
const { getBrandToday } = require('../../utils/brand-timezone.util');

/**
 * Write-only calendar-day usage log for the Fair Use daily posting cap — see
 * PostingUsageDaily's own schema comment for why this is separate from the
 * rolling-24h enforcement query (post-target.repository.js#countPublishedInLast24h).
 * Never read to decide whether to allow a publish; only for admin analytics.
 */
class PostingUsageDailyRepository {
  /**
   * Called once per real successful publish (social-publish.step.js, right
   * after a PostTarget flips to PUBLISHED) — upserts today's row for this
   * (socialAccountId, platform), incrementing publishedCount by 1.
   * `limitAtDate` is passed in by the caller (already has the current
   * PlatformDailyLimit loaded for the enforcement check) rather than
   * queried again here.
   */
  async incrementTodayUsage(brandId, socialAccountId, platform, limitAtDate, client = prisma) {
    const brand = await client.brand.findUnique({ where: { id: brandId }, select: { timezone: true } });
    const snapshotDate = getBrandToday(brand?.timezone);

    return client.postingUsageDaily.upsert({
      where: { socialAccountId_snapshotDate_platform: { socialAccountId, snapshotDate, platform } },
      update: {
        publishedCount: { increment: 1 },
        limitAtDate,
        fetchedAt: new Date()
      },
      create: {
        brandId,
        socialAccountId,
        platform,
        snapshotDate,
        publishedCount: 1,
        limitAtDate
      }
    });
  }

  /**
   * Monthly usage rows for admin analytics — "what % of accounts hit/neared
   * their daily cap this month", grouped by platform. Returns raw rows;
   * the service layer aggregates (this stays a thin DB-access method, no
   * business logic, per the repository layer's role in the Route →
   * Controller → Service → Repository convention).
   */
  async findByMonth(year, month, client = prisma) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    return client.postingUsageDaily.findMany({
      where: { snapshotDate: { gte: start, lt: end } },
      orderBy: { snapshotDate: 'asc' }
    });
  }
}

module.exports = new PostingUsageDailyRepository();
