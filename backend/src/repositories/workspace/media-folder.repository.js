const prisma = require('../../config/prisma');

class MediaFolderRepository {
  async create(data) {
    return prisma.mediaFolder.create({ data });
  }

  async findMany(where) {
    return prisma.mediaFolder.findMany({
      where,
      include: {
        _count: {
          select: {
            media: true,
            children: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  async findById(id) {
    return prisma.mediaFolder.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            media: true,
            children: true
          }
        }
      }
    });
  }

  async update(id, data) {
    return prisma.mediaFolder.update({
      where: { id },
      data
    });
  }

  async delete(id) {
    return prisma.mediaFolder.delete({
      where: { id }
    });
  }
}

module.exports = new MediaFolderRepository();
