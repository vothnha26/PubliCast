const templateRepository = require('../../repositories/admin/template.repository');
const { TEMPLATE_FORMAT, TEMPLATE_GOAL } = require('../../utils/constants');

class TemplateService {
  // No server-side cache here — the public read endpoint is cached at the
  // Cloudflare edge via its Cache-Control header (see
  // controllers/social/template.controller.js), which the admin write
  // endpoints purge via the CDN's own cache-invalidation API rather than
  // anything this service needs to know about.
  async getFeaturedTemplates() {
    return templateRepository.findAllCategoriesWithTemplates();
  }

  async createCategory({ name, sortOrder }) {
    const trimmedName = name?.trim();
    if (!trimmedName) {
      const error = new Error('Category name is required');
      error.status = 400;
      throw error;
    }

    const existing = await templateRepository.findCategoryByName(trimmedName);
    if (existing) {
      const error = new Error('A category with this name already exists');
      error.status = 409;
      throw error;
    }

    const category = await templateRepository.createCategory({ name: trimmedName, sortOrder });
    return category;
  }

  async updateCategory(id, { name, sortOrder }) {
    const data = {};
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        const error = new Error('Category name is required');
        error.status = 400;
        throw error;
      }
      data.name = trimmedName;
    }
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const category = await templateRepository.updateCategory(id, data);
    return category;
  }

  async deleteCategory(id) {
    await templateRepository.deleteCategory(id);
    return { message: 'Category deleted successfully' };
  }

  _validateCategoryIds(categoryIds) {
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      const error = new Error('At least one categoryId is required');
      error.status = 400;
      throw error;
    }
  }

  _validateFormat(format) {
    if (format !== undefined && format !== null && format !== '' && !Object.values(TEMPLATE_FORMAT).includes(format)) {
      const error = new Error('Invalid format value');
      error.status = 400;
      throw error;
    }
  }

  _validateGoal(goal) {
    if (goal !== undefined && goal !== null && goal !== '' && !Object.values(TEMPLATE_GOAL).includes(goal)) {
      const error = new Error('Invalid goal value');
      error.status = 400;
      throw error;
    }
  }

  async createTemplate({ categoryIds, emoji, title, description, body, format, goal }) {
    this._validateCategoryIds(categoryIds);
    this._validateFormat(format);
    this._validateGoal(goal);
    const trimmedTitle = title?.trim();
    const trimmedDescription = description?.trim();
    if (!trimmedTitle || !trimmedDescription) {
      const error = new Error('title and description are required');
      error.status = 400;
      throw error;
    }

    const template = await templateRepository.createTemplate({
      categoryIds,
      emoji,
      title: trimmedTitle,
      description: trimmedDescription,
      body: body?.trim() || null,
      format: format || null,
      goal: goal || null
    });
    return template;
  }

  async updateTemplate(id, { categoryIds, emoji, title, description, body, format, goal }) {
    const data = {};
    if (categoryIds !== undefined) {
      this._validateCategoryIds(categoryIds);
      data.categoryIds = categoryIds;
    }
    if (emoji !== undefined) data.emoji = emoji;
    if (title !== undefined) {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        const error = new Error('title is required');
        error.status = 400;
        throw error;
      }
      data.title = trimmedTitle;
    }
    if (description !== undefined) {
      const trimmedDescription = description.trim();
      if (!trimmedDescription) {
        const error = new Error('description is required');
        error.status = 400;
        throw error;
      }
      data.description = trimmedDescription;
    }
    if (body !== undefined) data.body = body?.trim() || null;
    if (format !== undefined) {
      this._validateFormat(format);
      data.format = format || null;
    }
    if (goal !== undefined) {
      this._validateGoal(goal);
      data.goal = goal || null;
    }

    const template = await templateRepository.updateTemplate(id, data);
    return template;
  }

  async deleteTemplate(id) {
    await templateRepository.deleteTemplate(id);
    return { message: 'Template deleted successfully' };
  }
}

module.exports = new TemplateService();
