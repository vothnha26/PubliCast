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
}

module.exports = new PostTargetRepository();
