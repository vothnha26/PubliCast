const templateRepository = require('../../repositories/admin/template.repository');
const redisClient = require('../../config/redis');
const logger = require('../../utils/logger');

// Featured templates change rarely (admin-curated content ideas) — cache the
// public read for an hour and purge on every admin write, same pattern as
// social.service.js's metrics cache.
const TEMPLATES_CACHE_KEY = 'templates:featured';
const TEMPLATES_CACHE_TTL_SECONDS = 3600;

class TemplateService {
  async getFeaturedTemplates() {
    if (redisClient.isOpen) {
      try {
        const cached = await redisClient.get(TEMPLATES_CACHE_KEY);
        if (cached) return JSON.parse(cached);
      } catch (err) {
        logger.warn('[TemplateService] Redis read failed, falling back to DB:', err.message);
      }
    }

    const categories = await templateRepository.findAllCategoriesWithTemplates();

    if (redisClient.isOpen) {
      redisClient.setEx(TEMPLATES_CACHE_KEY, TEMPLATES_CACHE_TTL_SECONDS, JSON.stringify(categories)).catch((err) => {
        logger.warn('[TemplateService] Redis write failed:', err.message);
      });
    }

    return categories;
  }

  async _invalidateCache() {
    if (!redisClient.isOpen) return;
    try {
      await redisClient.del(TEMPLATES_CACHE_KEY);
    } catch (err) {
      logger.warn('[TemplateService] Redis cache invalidation failed:', err.message);
    }
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
    await this._invalidateCache();
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
    await this._invalidateCache();
    return category;
  }

  async deleteCategory(id) {
    await templateRepository.deleteCategory(id);
    await this._invalidateCache();
    return { message: 'Category deleted successfully' };
  }

  _validateCategoryIds(categoryIds) {
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      const error = new Error('At least one categoryId is required');
      error.status = 400;
      throw error;
    }
  }

  async createTemplate({ categoryIds, emoji, title, description, body }) {
    this._validateCategoryIds(categoryIds);
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
      body: body?.trim() || null
    });
    await this._invalidateCache();
    return template;
  }

  async updateTemplate(id, { categoryIds, emoji, title, description, body }) {
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

    const template = await templateRepository.updateTemplate(id, data);
    await this._invalidateCache();
    return template;
  }

  async deleteTemplate(id) {
    await templateRepository.deleteTemplate(id);
    await this._invalidateCache();
    return { message: 'Template deleted successfully' };
  }
}

module.exports = new TemplateService();
