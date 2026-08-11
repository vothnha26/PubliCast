const prisma = require('../../config/prisma');

class MediaLibraryRepository {
  /**
   * Find media files with filters and pagination
   */
  async findManyAndCount(where, options = {}) {
    const { skip = 0, take = 20, orderBy = { createdAt: 'desc' } } = options;

    const [files, total] = await Promise.all([
      prisma.mediaLibrary.findMany({
        where,
        skip,
        take,
        orderBy
      }),
      prisma.mediaLibrary.count({ where })
    ]);

    return { files, total };
  }

  async findById(id) {
    return prisma.mediaLibrary.findUnique({
      where: { id }
    });
  }

  async delete(id) {
    return prisma.mediaLibrary.delete({
      where: { id }
    });
  }

  async create(data) {
    return prisma.mediaLibrary.create({
      data
    });
  }

  async update(id, data) {
    return prisma.mediaLibrary.update({
      where: { id },
      data
    });
  }

  async updateUsageByUrls(brandId, storageUrls, isUsed, client = prisma) {
    if (!storageUrls || storageUrls.length === 0) return { count: 0 };
    return client.mediaLibrary.updateMany({
      where: {
        brandId,
        storageUrl: { in: storageUrls }
      },
      data: { isUsed }
    });
  }

  /**
   * Media uploaded but never attached to a post (isUsed=false) past cutoffDate —
   * candidates for the orphan cleanup scheduler. Select is trimmed to what the
   * scheduler needs to publish a QStash message (skips Text columns like tags).
   */
  async findOrphanCandidates(cutoffDate, limit) {
    return prisma.mediaLibrary.findMany({
      where: { isUsed: false, createdAt: { lt: cutoffDate } },
      select: { id: true, brandId: true, mediaId: true, mimeType: true, storageUrl: true },
      orderBy: { createdAt: 'asc' },
      take: limit
    });
  }

  /**
   * Atomic compare-and-delete: only removes the row if isUsed is STILL false
   * at this exact moment, closing the race window between the orphan scan
   * (up to an hour ago) and this delete — a post attach in that window would
   * have flipped isUsed to true, and deleteMany then matches 0 rows instead
   * of removing a row that's actually in use.
   */
  async deleteIfStillUnused(id) {
    return prisma.mediaLibrary.deleteMany({
      where: { id, isUsed: false }
    });
  }
}

module.exports = new MediaLibraryRepository();
