const prisma = require('../../config/prisma');

/**
 * PostTargetRepository
 * SRP: DB operations on the PostTarget table (per-platform publish outcome).
 */
class PostTargetRepository {
  async updateStatus(postId, platform, socialAccountId, data, client = prisma) {
    return client.postTarget.update({
      where: { postId_socialAccountId: { postId, socialAccountId } },
      data
    });
  }

  async findByPostId(postId, client = prisma) {
    return client.postTarget.findMany({ where: { postId } });
  }

  /**
   * Fair Use daily posting cap enforcement — rolling 24h window, not a
   * calendar-day bucket. A calendar-day count would let a post at 23:59 and
   * another at 00:01 both land in separate "days", defeating the point of
   * the cap (protecting the account from the platform's own real rate
   * limit, which doesn't reset at local midnight either). This is the sole
   * source of truth used to allow/deny a publish — see
   * post.service.js#createPost (pre-check + locked re-check) and
   * social-publish.step.js (final check right before the live API call).
   * PostingUsageDaily is a separate, write-only calendar-day log for admin
   * analytics; never read here.
   */
  async countPublishedInLast24h(socialAccountId, platform, client = prisma) {
    return client.postTarget.count({
      where: {
        socialAccountId,
        platform,
        publishStatus: 'PUBLISHED',
        publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });
  }
}

module.exports = new PostTargetRepository();
