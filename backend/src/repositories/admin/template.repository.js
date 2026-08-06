const prisma = require('../../config/prisma');

class TemplateRepository {
  async findAllCategoriesWithTemplates() {
    const categories = await prisma.templateCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        templates: {
          include: { template: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      sortOrder: cat.sortOrder,
      templates: cat.templates.map((link) => link.template)
    }));
  }

  /**
   * Flat, paginated template list (used by the composer's Discover tab,
   * which flattens+dedupes categories into one scrollable list anyway).
   * Distinct from findAllCategoriesWithTemplates, which stays
   * unpaginated for FeaturedTemplatesTab.jsx's full-page category view.
   */
  async findManyTemplatesAndCount({ skip, take } = {}) {
    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        orderBy: { createdAt: 'asc' },
        skip,
        take,
        include: {
          categories: {
            include: { category: true }
          }
        }
      }),
      prisma.template.count()
    ]);

    return {
      templates: templates.map(({ categories, ...tpl }) => ({
        ...tpl,
        categoryIds: categories.map((link) => link.categoryId)
      })),
      total
    };
  }

  async findCategoryByName(name) {
    return prisma.templateCategory.findUnique({ where: { name } });
  }

  async findCategoryById(id) {
    return prisma.templateCategory.findUnique({ where: { id } });
  }

  async createCategory({ name, sortOrder }) {
    return prisma.templateCategory.create({
      data: { name, sortOrder: sortOrder ?? 0 }
    });
  }

  async updateCategory(id, { name, sortOrder }) {
    const data = {};
    if (name !== undefined) data.name = name;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    return prisma.templateCategory.update({ where: { id }, data });
  }

  async deleteCategory(id) {
    return prisma.templateCategory.delete({ where: { id } });
  }

  async findTemplateById(id) {
    return prisma.template.findUnique({
      where: { id },
      include: { categories: true }
    });
  }

  /**
   * categoryIds is always the full intended set for this template — the
   * caller (service layer) never sends incremental add/remove, so a
   * create + link-replace in one transaction keeps "assign to N
   * categories" a single round-trip, same pattern as
   * channel-group.repository.js's setMembers.
   */
  async createTemplate({ categoryIds, emoji, title, description, body, format, goal }) {
    return prisma.template.create({
      data: {
        emoji: emoji || null,
        title,
        description,
        body: body || null,
        format: format || null,
        goal: goal || null,
        categories: {
          create: categoryIds.map((categoryId) => ({ categoryId }))
        }
      },
      include: { categories: true }
    });
  }

  async updateTemplate(id, { categoryIds, emoji, title, description, body, format, goal }) {
    const data = {};
    if (emoji !== undefined) data.emoji = emoji;
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (body !== undefined) data.body = body;
    if (format !== undefined) data.format = format || null;
    if (goal !== undefined) data.goal = goal || null;

    return prisma.$transaction(async (tx) => {
      if (categoryIds !== undefined) {
        await tx.templateCategoryOnTemplate.deleteMany({ where: { templateId: id } });
        if (categoryIds.length > 0) {
          await tx.templateCategoryOnTemplate.createMany({
            data: categoryIds.map((categoryId) => ({ categoryId, templateId: id }))
          });
        }
      }

      return tx.template.update({
        where: { id },
        data,
        include: { categories: true }
      });
    });
  }

  async deleteTemplate(id) {
    return prisma.template.delete({ where: { id } });
  }
}

module.exports = new TemplateRepository();
