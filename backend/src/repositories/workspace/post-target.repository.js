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
   *
   * Counts by the real channel identity (SocialAccount.platformAccountId),
   * not by socialAccountId — SocialAccount.id is only unique per
   * (brandId, platform, platformAccountId), so the same real YouTube/
   * Facebook/etc. channel connected into two different brands gets two
   * separate SocialAccount rows with different ids. Counting by
   * socialAccountId would let that one real channel receive the cap twice
   * over (once per brand), defeating the point of protecting the channel
   * from the platform's own rate limit.
   */
  async countPublishedInLast24h(socialAccountId, platform, client = prisma) {
    const account = await client.socialAccount.findUnique({
      where: { id: socialAccountId },
      select: { platformAccountId: true }
    });
    if (!account) return 0;

    return client.postTarget.count({
      where: {
        platform,
        publishStatus: 'PUBLISHED',
        publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        socialAccount: { platformAccountId: account.platformAccountId, platform }
      }
    });
  }
}

module.exports = new PostTargetRepository();
