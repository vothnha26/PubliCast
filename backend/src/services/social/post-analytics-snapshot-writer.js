const prisma = require('../../config/prisma');

/**
 * The ONLY place that writes to postAnalyticsDailySnapshot. Every caller
 * (cron sync, cold-start, backfill, carry-forward) must go through this
 * so the unique constraint on [platformPostId, date] can never be violated
 * by a bare `create()` call elsewhere.
 *
 * Deliberately has no dependency on any platform service (Facebook/YouTube/
 * TikTok) so it can be required from any of them without pulling in the
 * rest of the social service graph.
 */
async function upsertDailySnapshot({ postId, platformPostId, brandId, platform, date, metrics, isEstimated }) {
  const normalizedDate = new Date(date);
  normalizedDate.setUTCHours(0, 0, 0, 0);

  const data = {
    postId: postId || null,
    platformPostId,
    brandId,
    platform,
    date: normalizedDate,
    viewsCumulative: metrics.views || 0,
    reachCumulative: metrics.reach || 0,
    clicksCumulative: metrics.clicks || 0,
    reactionsCumulative: metrics.reactions || 0,
    isEstimated: !!isEstimated
  };

  return prisma.postAnalyticsDailySnapshot.upsert({
    where: { platformPostId_date: { platformPostId, date: normalizedDate } },
    create: data,
    update: data
  });
}

module.exports = { upsertDailySnapshot };
