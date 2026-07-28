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
}

module.exports = new MediaLibraryRepository();
