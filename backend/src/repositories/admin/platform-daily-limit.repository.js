const prisma = require('../../config/prisma');

/**
 * Fair Use daily posting cap per platform — see PlatformDailyLimit's schema
 * comment for why this is a separate table from PlatformLimit (which is
 * keyed per subType, not per platform).
 */
class PlatformDailyLimitRepository {
  async findAll(client = prisma) {
    return client.platformDailyLimit.findMany({ orderBy: { platform: 'asc' } });
  }

  async findByPlatform(platform, client = prisma) {
    return client.platformDailyLimit.findUnique({ where: { platform } });
  }

  async findById(id, client = prisma) {
    return client.platformDailyLimit.findUnique({ where: { id } });
  }

  async update(id, data, client = prisma) {
    return client.platformDailyLimit.update({ where: { id }, data });
  }
}

module.exports = new PlatformDailyLimitRepository();
