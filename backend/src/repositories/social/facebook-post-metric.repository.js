const prisma = require('../../config/prisma');

/**
 * FacebookPostMetricRepository
 * SRP: DB-first cache reads/writes for per-post Facebook insight fetches
 * (see FacebookPostMetric in schema.prisma) — used by both the published-
 * posts list (getPublishedPosts) and the single-post detail view
 * (getPostDetails) in facebook-post.service.js.
 */
class FacebookPostMetricRepository {
  async findByAccountAndPost(socialAccountId, platformPostId, client = prisma) {
    return client.facebookPostMetric.findUnique({
      where: { socialAccountId_platformPostId: { socialAccountId, platformPostId } }
    });
  }

  async findByBrandAndPost(brandId, platformPostId, client = prisma) {
    return client.facebookPostMetric.findFirst({
      where: { brandId, platformPostId }
    });
  }

  async findByAccountSincePublished(brandId, socialAccountId, cutoff, client = prisma) {
    return client.facebookPostMetric.findMany({
      where: { brandId, socialAccountId, publishedAt: { gte: cutoff } },
      orderBy: { publishedAt: 'desc' }
    });
  }

  async upsert(socialAccountId, platformPostId, data, client = prisma) {
    return client.facebookPostMetric.upsert({
      where: { socialAccountId_platformPostId: { socialAccountId, platformPostId } },
      create: { socialAccountId, platformPostId, ...data.create },
      update: data.update
    });
  }
}

module.exports = new FacebookPostMetricRepository();
