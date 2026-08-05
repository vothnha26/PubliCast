const helpCenterPrisma = require('../../config/help-center-prisma');

class HelpArticleRepository {
  async list({ status, category } = {}) {
    return helpCenterPrisma.helpArticle.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(category ? { category } : {})
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async findById(id) {
    return helpCenterPrisma.helpArticle.findUnique({ where: { id } });
  }

  async findBySlug(slug) {
    return helpCenterPrisma.helpArticle.findUnique({ where: { slug } });
  }

  async create(data) {
    return helpCenterPrisma.helpArticle.create({ data });
  }

  async update(id, data) {
    return helpCenterPrisma.helpArticle.update({ where: { id }, data });
  }

  async remove(id) {
    return helpCenterPrisma.helpArticle.delete({ where: { id } });
  }
}

module.exports = new HelpArticleRepository();
