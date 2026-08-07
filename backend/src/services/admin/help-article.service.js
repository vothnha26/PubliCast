const helpArticleRepository = require('../../repositories/admin/help-article.repository');
const helpCenterPrisma = require('../../config/help-center-prisma');
const { chunkContent } = require('../help-center/chunking.service');
const { embedText, toPgvectorLiteral } = require('../help-center/embedding.service');
const logger = require('../../utils/logger');

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

    await this._embedArticle(id, updated.contentHtml);

    return updated;
  }

  /**
   * Chunks and embeds an article's content into the Help Center pgvector
   * store. Runs synchronously on publish — was a BullMQ job, but publishing
   * is an already-rare admin action, so the async-queue/worker overhead
   * (its own idle Redis polling 24/7) cost more than the few extra seconds
   * an admin waits for this to finish inline.
   */
  async _embedArticle(articleId, contentHtml) {
    const chunks = chunkContent(contentHtml);

    // Drop previous chunks/vectors before re-embedding — avoids stale
    // vectors lingering after an edit removes or rewords content.
    await helpCenterPrisma.helpArticleChunk.deleteMany({ where: { articleId } });

    for (let i = 0; i < chunks.length; i += 1) {
      const text = chunks[i];
      const embedding = await embedText(text);
      const vectorLiteral = toPgvectorLiteral(embedding);

      // Prisma doesn't generate a field for Unsupported("vector") columns,
      // so the insert (including the embedding column) goes through a
      // parameterized raw query — safe from injection since values are
      // bound, not string-concatenated into the SQL itself.
      await helpCenterPrisma.$executeRaw`
        INSERT INTO "HelpArticleChunk" (id, "articleId", "chunkIndex", text, embedding, "createdAt")
        VALUES (gen_random_uuid()::text, ${articleId}, ${i}, ${text}, ${vectorLiteral}::vector, now())
      `;
    }

    logger.debug(`[HelpArticleService] Embedded ${chunks.length} chunks for article: ${articleId}`);
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
