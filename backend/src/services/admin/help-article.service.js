const helpArticleRepository = require('../../repositories/admin/help-article.repository');
const { helpCenterEmbeddingQueue } = require('../../queues/help-center-embedding.queue');
const { QUEUE_CONFIG } = require('../../constants/help-center.constants');

class HelpArticleService {
  async list(filters) {
    return helpArticleRepository.list(filters);
  }

  async getById(id) {
    const article = await helpArticleRepository.findById(id);
    if (!article) {
      const err = new Error('Help article not found');
      err.statusCode = 404;
      throw err;
    }
    return article;
  }

  async create({ title, slug, category, tags, contentJson, contentHtml, authorId }) {
    if (!title || !slug || !category || !contentJson || !contentHtml) {
      const err = new Error('title, slug, category, contentJson and contentHtml are required');
      err.statusCode = 400;
      throw err;
    }

    const existing = await helpArticleRepository.findBySlug(slug);
    if (existing) {
      const err = new Error(`Slug "${slug}" is already in use`);
      err.statusCode = 409;
      throw err;
    }

    return helpArticleRepository.create({
      title,
      slug,
      category,
      tags: tags || [],
      contentJson,
      contentHtml,
      authorId
    });
  }

  async update(id, { title, slug, category, tags, contentJson, contentHtml }) {
    await this.getById(id);

    if (slug) {
      const existing = await helpArticleRepository.findBySlug(slug);
      if (existing && existing.id !== id) {
        const err = new Error(`Slug "${slug}" is already in use`);
        err.statusCode = 409;
        throw err;
      }
    }

    return helpArticleRepository.update(id, {
      ...(title !== undefined ? { title } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(contentJson !== undefined ? { contentJson } : {}),
      ...(contentHtml !== undefined ? { contentHtml } : {})
    });
  }

  async publish(id) {
    await this.getById(id);

    const updated = await helpArticleRepository.update(id, {
      status: 'PUBLISHED',
      publishedAt: new Date()
    });

    await helpCenterEmbeddingQueue.add(
      QUEUE_CONFIG.HELP_CENTER_EMBEDDING.JOB_EMBED_ARTICLE,
      { articleId: id }
    );

    return updated;
  }

  async unpublish(id) {
    await this.getById(id);
    return helpArticleRepository.update(id, { status: 'ARCHIVED' });
  }

  async remove(id) {
    await this.getById(id);
    return helpArticleRepository.remove(id);
  }
}

module.exports = new HelpArticleService();
