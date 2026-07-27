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
}

module.exports = new MediaLibraryRepository();
